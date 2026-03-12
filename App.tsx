import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { SLIK_CONFIG, SEGMENT_MAP } from './constants';
import { DataRow, Step, SchemaField } from './types';
import { decryptCell } from './utils/crypto';
import { applyLogic } from './transformers';
import { validateData, validateUniqueness, ValidationResult, ValidationError } from './validation';
import { languages, Language } from './i18n';

const enforceConstraints = (val: string, field: SchemaField): string => {
  if (!field.fixedLength) return val;
  const target = field.fixedLength;
  const char = field.padChar || '0';
  const type = field.padType || 'left';
  let res = val.substring(0, target);
  return type === 'left' ? res.padStart(target, char) : res.padEnd(target, char);
};

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.UPLOAD);
  const [segmentsData, setSegmentsData] = useState<Record<string, DataRow[]>>({});
  const [previewSegment, setPreviewSegment] = useState<string>('D01');
  const [loading, setLoading] = useState(false);
  const [switchingSegment, setSwitchingSegment] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [reportDate, setReportDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return { year: d.getFullYear().toString(), month: (d.getMonth() + 1).toString().padStart(2, '0') };
  });
  const [language, setLanguage] = useState<Language>('zh');
  
  const t = (key: keyof typeof languages.zh) => languages[language][key];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const newSegs: Record<string, DataRow[]> = {};
        for (const sn of wb.SheetNames) {
          const json: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: "" });
          let code = 'OTHER';
          for (const [c, d] of Object.entries(SEGMENT_MAP)) {
            if (d.keywords.some(kw => sn.toUpperCase().includes(kw))) { code = c; break; }
          }
          console.log(`[DEBUG] Sheet "${sn}" 原始数据样例:`, json.slice(0, 2));
          console.log(`[DEBUG] Sheet "${sn}" 识别为代码:`, code);
          console.log(`[DEBUG] Sheet "${sn}" 总行数:`, json.length);

          const rows = await Promise.all(json.map(async (r, idx) => {
            const nr: DataRow = {};
            // 解密所有单元格，并同时保存原始键、大写化键以及常见变体以提高匹配率
            for (const k in r) {
              const decrypted = await decryptCell(r[k], k);
              const val = String(decrypted || "").trim();
              nr[k] = val;
              nr[k.toUpperCase()] = val;
              // 针对印尼语常见列名的额外映射
              const cleanK = k.toUpperCase().replace(/[^A-Z0-9]/g, "");
              nr[cleanK] = val;
            }
            if (idx === 0) {
              console.log(`[DEBUG] 第一行处理后的数据:`, nr);
              console.log(`[DEBUG] 所有列名:`, Object.keys(nr));
            }
            if (idx === 1) {
              console.log(`[DEBUG] 第二行处理后的数据:`, nr);
            }
            return nr;
          }));
          console.log(`[DEBUG] Sheet "${sn}" 处理后的数据行数:`, rows.length);
          newSegs[code] = [...(newSegs[code] || []), ...rows];
        }
        console.log(`[DEBUG] 所有数据段及行数:`, Object.entries(newSegs).map(([code, rows]) => `${code}: ${rows.length} 行`));
        setSegmentsData(newSegs);
        // 将数据暴露到全局，方便调试
        (window as any).DEBUG_SEGMENTS_DATA = newSegs;
        console.log('[DEBUG] 数据已保存到 window.DEBUG_SEGMENTS_DATA');
        console.log('[DEBUG] 所有数据段:', Object.keys(newSegs));
        console.log('[DEBUG] D01 数据样例:', newSegs['D01']?.slice(0, 2));
        setCurrentStep(Step.CONFIGURE);
      } catch (err) { alert("File error: " + err); } finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  };

  // 优化：只计算当前预览数据段的转换结果
  const currentSegmentData = useMemo(() => {
    const sc = previewSegment;
    const def = (SEGMENT_MAP as any)[sc];
    const rows = segmentsData[sc] || [];
    return rows.map((row, rowIndex) => {
      const tr: Record<string, string> = {};
      def.schema.forEach((f: SchemaField) => {
        // 按照优先级查找：1. 显式指定的 source 2. 大写化的 source 3. Schema 中的 name 4. 大写化的 name 5. 常见印尼语变体
        const sourceKey = f.source || "";
        const nameKey = f.name || "";

        let raw = row?.[sourceKey] || row?.[sourceKey.toUpperCase()] || row?.[nameKey] || row?.[nameKey.toUpperCase()];

        // 如果还是没找到，尝试模糊匹配（移除特殊字符）
        if (raw === undefined || raw === null || raw === "") {
          const cleanSource = sourceKey.toUpperCase().replace(/[^A-Z0-9]/g, "");
          const cleanName = nameKey.toUpperCase().replace(/[^A-Z0-9]/g, "");
          raw = row?.[cleanSource] || row?.[cleanName] || "";
        }

        // 最后的兜底：如果还是没找到，且是城市相关的字段，尝试在所有列中寻找包含 "KABUPATEN" 或 "KOTA" 的列
        if ((raw === undefined || raw === null || raw === "") && f.transform === 'city_code' && row) {
          const cityKey = Object.keys(row).find(k => {
            const uk = k.toUpperCase();
            return uk.includes("KABUPATEN") || uk.includes("KOTA") || uk.includes("CITY");
          });
          if (cityKey) raw = row[cityKey];
        }

        // 最后的兜底：如果还是没找到，且是收入相关的字段，尝试在所有列中寻找包含 "PENGHASILAN" 或 "INCOME" 的列
        if ((raw === undefined || raw === null || raw === "") && (f.name.includes("PENGHASILAN") || (f.source && f.source.includes("PENGHASILAN"))) && row) {
          const incomeKey = Object.keys(row).find(k => {
            const uk = k.toUpperCase();
            return uk.includes("PENGHASILAN") || uk.includes("INCOME") || uk.includes("SALARY");
          });
          if (incomeKey) raw = row[incomeKey];
        }

        // 为教育程度、性别等字段添加兜底逻辑
        if ((raw === undefined || raw === null || raw === "") && f.transform === 'education_code' && row) {
          const eduKey = Object.keys(row).find(k => {
            const uk = k.toUpperCase();
            return uk.includes("PENDIDIKAN") || uk.includes("EDUCATION") || uk.includes("STATUS PENDIDIKAN");
          });
          if (eduKey) raw = row[eduKey];
        }

        if ((raw === undefined || raw === null || raw === "") && f.transform === 'gender_code' && row) {
          const genderKey = Object.keys(row).find(k => {
            const uk = k.toUpperCase();
            return uk.includes("KELAMIN") || uk.includes("GENDER") || uk.includes("SEX");
          });
          if (genderKey) raw = row[genderKey];
        }

        if ((raw === undefined || raw === null || raw === "") && f.transform === 'sector_code' && row) {
          const sectorKey = Object.keys(row).find(k => {
            const uk = k.toUpperCase();
            return uk.includes("BIDANG USAHA") || uk.includes("SECTOR") || uk.includes("INDUSTRY") || uk.includes("PEKERJAAN");
          });
          if (sectorKey) raw = row[sectorKey];
        }

        // 为职业代码添加兜底逻辑
        if ((raw === undefined || raw === null || raw === "") && f.transform === 'occupation_code' && row) {
          const occKey = Object.keys(row).find(k => {
            const uk = k.toUpperCase();
            return uk.includes("PEKERJAAN") || uk.includes("OCCUPATION") || uk.includes("JOB");
          });
          if (occKey) raw = row[occKey];
        }

        // 为婚姻状况添加兜底逻辑
        if ((raw === undefined || raw === null || raw === "") && f.transform === 'marital_code' && row) {
          const maritalKey = Object.keys(row).find(k => {
            const uk = k.toUpperCase();
            return uk.includes("PERKAWINAN") || uk.includes("MARITAL") || uk.includes("STATUS PERKAWINAN");
          });
          if (maritalKey) raw = row[maritalKey];
        }

        // 添加字段级别的调试日志
        if (rowIndex < 2 && (f.transform === 'education_code' || f.transform === 'gender_code' || f.transform === 'sector_code' || f.transform === 'occupation_code' || f.transform === 'city_code')) {
          console.log(`[DEBUG] 行 ${rowIndex}, 字段 ${f.name}:`, { sourceKey, nameKey, raw });
        }

        const base = applyLogic(raw === "" ? (f.default || "") : raw, f.transform, row || undefined);
        // 预览时不进行强制长度补位，仅进行基本清洗、转大写并去除首尾空格
        let val = String(base).replace(/[^\x00-\x7F]/g, "").trim();
        if (f.name !== "ALAMAT EMAIL") {
          val = val.toUpperCase();
        }
        tr[f.name] = val;
      });
      return tr;
    });
  }, [previewSegment, segmentsData]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return currentSegmentData?.slice(startIndex, endIndex) || [];
  }, [currentSegmentData, currentPage, pageSize]);

  const totalPages = Math.ceil((currentSegmentData?.length || 0) / pageSize);

  // 处理数据段切换
  const handleSegmentChange = (newSegment: string) => {
    if (newSegment === previewSegment) return;
    setSwitchingSegment(true);
    setCurrentPage(1);
    setTimeout(() => {
      setPreviewSegment(newSegment);
      setSwitchingSegment(false);
    }, 100);
  };

  // 为导出准备的完整转换数据
  const transformed = useMemo(() => {
    const res: Record<string, any[]> = {};
    SLIK_CONFIG.MANDATORY_SEGMENTS.forEach(sc => {
      const def = (SEGMENT_MAP as any)[sc];
      const rows = segmentsData[sc] || [];
      res[sc] = rows.map((row, rowIndex) => {
        const tr: Record<string, string> = {};
        def.schema.forEach((f: SchemaField) => {
          // 按照优先级查找：1. 显式指定的 source 2. 大写化的 source 3. Schema 中的 name 4. 大写化的 name 5. 常见印尼语变体
          const sourceKey = f.source || "";
          const nameKey = f.name || "";

          let raw = row?.[sourceKey] || row?.[sourceKey.toUpperCase()] || row?.[nameKey] || row?.[nameKey.toUpperCase()];

          // 如果还是没找到，尝试模糊匹配（移除特殊字符）
          if (raw === undefined || raw === null || raw === "") {
            const cleanSource = sourceKey.toUpperCase().replace(/[^A-Z0-9]/g, "");
            const cleanName = nameKey.toUpperCase().replace(/[^A-Z0-9]/g, "");
            raw = row?.[cleanSource] || row?.[cleanName] || "";
          }

          // 最后的兜底：如果还是没找到，且是城市相关的字段，尝试在所有列中寻找包含 "KABUPATEN" 或 "KOTA" 的列
          if ((raw === undefined || raw === null || raw === "") && f.transform === 'city_code' && row) {
            const cityKey = Object.keys(row).find(k => {
              const uk = k.toUpperCase();
              return uk.includes("KABUPATEN") || uk.includes("KOTA") || uk.includes("CITY");
            });
            if (cityKey) raw = row[cityKey];
          }

          // 最后的兜底：如果还是没找到，且是收入相关的字段，尝试在所有列中寻找包含 "PENGHASILAN" 或 "INCOME" 的列
          if ((raw === undefined || raw === null || raw === "") && (f.name.includes("PENGHASILAN") || (f.source && f.source.includes("PENGHASILAN"))) && row) {
            const incomeKey = Object.keys(row).find(k => {
              const uk = k.toUpperCase();
              return uk.includes("PENGHASILAN") || uk.includes("INCOME") || uk.includes("SALARY");
            });
            if (incomeKey) raw = row[incomeKey];
          }

          // 为教育程度、性别等字段添加兜底逻辑
          if ((raw === undefined || raw === null || raw === "") && f.transform === 'education_code' && row) {
            const eduKey = Object.keys(row).find(k => {
              const uk = k.toUpperCase();
              return uk.includes("PENDIDIKAN") || uk.includes("EDUCATION") || uk.includes("STATUS PENDIDIKAN");
            });
            if (eduKey) raw = row[eduKey];
          }

          if ((raw === undefined || raw === null || raw === "") && f.transform === 'gender_code' && row) {
            const genderKey = Object.keys(row).find(k => {
              const uk = k.toUpperCase();
              return uk.includes("KELAMIN") || uk.includes("GENDER") || uk.includes("SEX");
            });
            if (genderKey) raw = row[genderKey];
          }

          if ((raw === undefined || raw === null || raw === "") && f.transform === 'sector_code' && row) {
            const sectorKey = Object.keys(row).find(k => {
              const uk = k.toUpperCase();
              return uk.includes("BIDANG USAHA") || uk.includes("SECTOR") || uk.includes("INDUSTRY") || uk.includes("PEKERJAAN");
            });
            if (sectorKey) raw = row[sectorKey];
          }

          // 为职业代码添加兜底逻辑
          if ((raw === undefined || raw === null || raw === "") && f.transform === 'occupation_code' && row) {
            const occKey = Object.keys(row).find(k => {
              const uk = k.toUpperCase();
              return uk.includes("PEKERJAAN") || uk.includes("OCCUPATION") || uk.includes("JOB");
            });
            if (occKey) raw = row[occKey];
          }

          // 为婚姻状况添加兜底逻辑
          if ((raw === undefined || raw === null || raw === "") && f.transform === 'marital_code' && row) {
            const maritalKey = Object.keys(row).find(k => {
              const uk = k.toUpperCase();
              return uk.includes("PERKAWINAN") || uk.includes("MARITAL") || uk.includes("STATUS PERKAWINAN");
            });
            if (maritalKey) raw = row[maritalKey];
          }

          // 添加字段级别的调试日志
          if (rowIndex < 2 && (f.transform === 'education_code' || f.transform === 'gender_code' || f.transform === 'sector_code' || f.transform === 'occupation_code' || f.transform === 'city_code')) {
            console.log(`[DEBUG] 行 ${rowIndex}, 字段 ${f.name}:`, { sourceKey, nameKey, raw });
          }

          const base = applyLogic(raw === "" ? (f.default || "") : raw, f.transform, row || undefined);
          // 预览时不进行强制长度补位，仅进行基本清洗、转大写并去除首尾空格
          let val = String(base).replace(/[^\x00-\x7F]/g, "").trim();
          if (f.name !== "ALAMAT EMAIL") {
            val = val.toUpperCase();
          }
          tr[f.name] = val;
        });
        return tr;
      });
    });
    // 将转换后的数据也暴露到全局
    (window as any).DEBUG_TRANSFORMED_DATA = res;
    console.log('[DEBUG] 转换后的数据已保存到 window.DEBUG_TRANSFORMED_DATA');
    console.log('[DEBUG] D01 转换后样例:', res['D01']?.slice(0, 2));
    return res;
  }, [segmentsData]);

  const download = async (ignoreErrors = false) => {
    setLoading(true);
    try {
      const uniquenessErrors = validateUniqueness(transformed);
      const fieldValidation = validateData(transformed, SEGMENT_MAP as any, reportDate);
      
      const allErrors = [...uniquenessErrors, ...fieldValidation.errors];
      const allWarnings = fieldValidation.warnings;

      setValidationResult({
        errors: allErrors,
        warnings: allWarnings,
        isValid: allErrors.filter(e => e.priority === 'P0').length === 0
      });

      if (allErrors.length > 0 && !ignoreErrors) {
        setShowValidation(true);
        setLoading(false);
        return;
      }

      const zip = new JSZip();
      SLIK_CONFIG.MANDATORY_SEGMENTS.forEach(sc => {
        const rows = transformed[sc] || [];
        const schema = (SEGMENT_MAP as any)[sc].schema;

        // Header line
        const h = `H|${SLIK_CONFIG.SENDER_TYPE}|${SLIK_CONFIG.ORG_CODE}|${reportDate.year}|${reportDate.month}|${sc}|${rows.length}|${rows.length}`;

        // Data lines joined with CRLF, applying constraints only at export time
        const c = rows.filter(r => r).map(r => {
          return schema.map((f: SchemaField) => {
            const val = r[f.name] || "";
            // 修复：导出时不进行强制补位，直接使用原始值，避免出现大段空格
            return val;
          }).join(SLIK_CONFIG.SEPARATOR);
        }).join('\r\n');

        /**
         * 关键修复：确保文件末尾始终有一个换行符 (\r\n)
         * OJK 系统校验要求最后一行数据之后必须有 Enter。
         */
        let finalFileContent = h + '\r\n';
        if (c) {
          finalFileContent += c + '\r\n';
        }

        zip.file(`${SLIK_CONFIG.SENDER_TYPE}.${SLIK_CONFIG.ORG_CODE}.${reportDate.year}.${reportDate.month}.${sc}.${SLIK_CONFIG.FILE_SEQ}.txt`, finalFileContent);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      FileSaver.saveAs(blob, `SLIK_${reportDate.year}${reportDate.month}.zip`);
      setCurrentStep(Step.EXPORT);
    } catch (e) { 
      console.error("ZIP error details:", e);
      alert("ZIP error: " + e + "\n\nStack: " + (e as Error).stack); 
    } finally { setLoading(false); }
  };

  // 步骤指示器
  const steps = [
    { id: Step.UPLOAD, label: t('upload'), icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
    { id: Step.CONFIGURE, label: t('configure'), icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: Step.EXPORT, label: t('export'), icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  const getStepStatus = (stepId: Step) => {
    if (currentStep === stepId) return 'active';
    if (currentStep > stepId) return 'completed';
    return 'pending';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .spin { animation: spin 1s linear infinite; }
        .float { animation: float 3s ease-in-out infinite; }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '24px 32px',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                SLIK REPORTING PRO
              </h1>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500', marginLeft: '52px' }}>
              Automatic Decryption Engine Enabled
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f3f4f6',
              padding: '8px 16px',
              borderRadius: '12px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input
                style={{
                  background: 'transparent',
                  border: 'none',
                  width: '60px',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#374151',
                  outline: 'none'
                }}
                value={reportDate.year}
                onChange={e => setReportDate({ ...reportDate, year: e.target.value })}
              />
              <span style={{ color: '#9ca3af', fontWeight: 'bold' }}>/</span>
              <input
                style={{
                  background: 'transparent',
                  border: 'none',
                  width: '40px',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#374151',
                  outline: 'none'
                }}
                value={reportDate.month}
                onChange={e => setReportDate({ ...reportDate, month: e.target.value })}
              />
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#f3f4f6',
              padding: '8px 12px',
              borderRadius: '12px'
            }}>
              <button
                onClick={() => setLanguage('zh')}
                style={{
                  background: language === 'zh' ? '#667eea' : 'transparent',
                  color: language === 'zh' ? 'white' : '#374151',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                style={{
                  background: language === 'en' ? '#667eea' : 'transparent',
                  color: language === 'en' ? 'white' : '#374151',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                English
              </button>
            </div>
          </div>
        </header>

        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px',
          gap: '16px'
        }}>
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: status === 'active'
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : status === 'completed'
                        ? '#10b981'
                        : 'rgba(255, 255, 255, 0.3)',
                    boxShadow: status === 'active'
                      ? '0 4px 15px rgba(102, 126, 234, 0.4)'
                      : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d={step.icon} strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: status === 'active' ? 'white' : 'rgba(255, 255, 255, 0.7)'
                  }}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div style={{
                    width: '60px',
                    height: '2px',
                    background: status === 'completed'
                      ? '#10b981'
                      : 'rgba(255, 255, 255, 0.3)'
                  }}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="fade-in" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '80px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#667eea',
              borderRadius: '50%'
            }} className="spin"/>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
              {t('processing')}
            </h3>
            <p style={{ color: '#6b7280' }}>{t('processingDesc')}</p>
          </div>
        )}

        {/* Upload Step */}
        {currentStep === Step.UPLOAD && !loading && (
          <div className="fade-in" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '80px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="float" style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 32px',
              background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="url(#excelGradient)" strokeWidth="1.5">
                <defs>
                  <linearGradient id="excelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea"/>
                    <stop offset="100%" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#1f2937', marginBottom: '12px' }}>
              {t('uploadTitle')}
            </h2>
            <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
              {t('uploadDesc')}
            </p>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '16px 40px',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
              ':hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)'
              }
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {t('selectFile')}
              <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept=".xlsx, .xls" />
            </label>
          </div>
        )}

        {/* Configure Step */}
        {currentStep === Step.CONFIGURE && !loading && (
          <div className="fade-in" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
                  {t('previewTitle')}
                </h2>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  {t('previewDesc')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    const uniquenessErrors = validateUniqueness(transformed);
                    const fieldValidation = validateData(transformed, SEGMENT_MAP as any, reportDate);
                    
                    const allErrors = [...uniquenessErrors, ...fieldValidation.errors];
                    const allWarnings = fieldValidation.warnings;

                    setValidationResult({
                      errors: allErrors,
                      warnings: allWarnings,
                      isValid: allErrors.filter(e => e.priority === 'P0').length === 0
                    });
                    setShowValidation(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'white',
                    color: '#667eea',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: '2px solid #667eea',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.2)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {t('validate')}
                </button>
                <button
                  onClick={download}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {t('generate')}
                </button>
              </div>
            </div>

            {/* Segment Tabs */}
            <div style={{
              padding: '16px 32px',
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {Object.keys(segmentsData).map(seg => {
                const isActive = previewSegment === seg;
                const count = segmentsData[seg].length;
                return (
                  <button
                    key={seg}
                    onClick={() => handleSegmentChange(seg)}
                    disabled={switchingSegment}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: switchingSegment ? 'not-allowed' : 'pointer',
                      opacity: switchingSegment ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      background: isActive
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'white',
                      color: isActive ? 'white' : '#374151',
                      boxShadow: isActive
                        ? '0 4px 15px rgba(102, 126, 234, 0.4)'
                        : '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <span>{seg}</span>
                    <span style={{
                      background: isActive ? 'rgba(255,255,255,0.3)' : '#e5e7eb',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                      {count} {t('records')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Data Table */}
            <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: '0',
                fontSize: '13px'
              }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}>
                  <tr>
                    {(SEGMENT_MAP as any)[previewSegment]?.schema.map((f: SchemaField) => (
                      <th key={f.name} style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#374151',
                        background: '#f3f4f6',
                        borderBottom: '2px solid #e5e7eb',
                        whiteSpace: 'nowrap',
                        fontSize: '13px',
                        verticalAlign: 'top'
                      }}>
                        <div style={{ fontSize: '13px', marginBottom: '2px' }}>
                          {f.label_cn || f.name}
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: '#6b7280',
                          fontWeight: '400',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {f.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {switchingSegment ? (
                    <tr>
                      <td colSpan={(SEGMENT_MAP as any)[previewSegment]?.schema.length || 1} style={{
                        padding: '60px',
                        textAlign: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                          <div className="spin" style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid #e5e7eb',
                            borderTop: '3px solid #667eea',
                            borderRadius: '50%'
                          }}></div>
                          <div style={{ fontSize: '16px', fontWeight: '600' }}>
                            {t('loading')}
                          </div>
                          <div style={{ fontSize: '14px' }}>
                            {t('loadingDesc')}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={(SEGMENT_MAP as any)[previewSegment]?.schema.length || 1} style={{
                        padding: '60px',
                        textAlign: 'center',
                        color: '#9ca3af'
                      }}>
                        <div style={{ fontSize: '16px' }}>
                          {t('noData')}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((row, i) => (
                      <tr key={i} style={{
                        background: i % 2 === 0 ? 'white' : '#fafafa',
                        transition: 'background 0.2s ease'
                      }}>
                        {(SEGMENT_MAP as any)[previewSegment]?.schema.map((f: SchemaField) => (
                          <td key={f.name} style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f3f4f6',
                            color: row[f.name] ? '#374151' : '#9ca3af',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {row[f.name] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* 分页控件 */}
              {currentSegmentData && currentSegmentData.length > 0 && (
                <div style={{
                  padding: '16px 32px',
                  background: '#f9fafb',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span style={{ color: '#6b7280', fontSize: '13px' }}>
                      每页显示:
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                    <span style={{ color: '#6b7280', fontSize: '13px' }}>
                      共 {currentSegmentData.length} 条记录
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1 || switchingSegment}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: 'white',
                        cursor: currentPage === 1 || switchingSegment ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 || switchingSegment ? 0.5 : 1,
                        fontSize: '13px'
                      }}
                    >
                      首页
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1 || switchingSegment}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: 'white',
                        cursor: currentPage === 1 || switchingSegment ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 || switchingSegment ? 0.5 : 1,
                        fontSize: '13px'
                      }}
                    >
                      上一页
                    </button>
                    <span style={{
                      padding: '6px 16px',
                      borderRadius: '6px',
                      background: '#667eea',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages || switchingSegment}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: 'white',
                        cursor: currentPage === totalPages || switchingSegment ? 'not-allowed' : 'pointer',
                        opacity: currentPage === totalPages || switchingSegment ? 0.5 : 1,
                        fontSize: '13px'
                      }}
                    >
                      下一页
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || switchingSegment}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: 'white',
                        cursor: currentPage === totalPages || switchingSegment ? 'not-allowed' : 'pointer',
                        opacity: currentPage === totalPages || switchingSegment ? 0.5 : 1,
                        fontSize: '13px'
                      }}
                    >
                      末页
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div style={{
              padding: '16px 32px',
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>当前数据段: </span>
                  <span style={{ fontWeight: '700', color: '#374151' }}>{previewSegment}</span>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>总记录数: </span>
                  <span style={{ fontWeight: '700', color: '#374151' }}>
                    {currentSegmentData?.length || 0}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep(Step.UPLOAD)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                重新上传
              </button>
            </div>
          </div>
        )}

        {/* Export Success Step */}
        {currentStep === Step.EXPORT && !loading && (
          <div className="fade-in" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '80px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 32px',
              background: 'linear-gradient(135deg, #10b98120 0%, #05966920 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#1f2937', marginBottom: '12px' }}>
              导出成功！
            </h2>
            <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '40px' }}>
              SLIK 上报文件已成功生成并下载。
            </p>
            <button
              onClick={() => setCurrentStep(Step.UPLOAD)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '16px 40px',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              上传新文件
            </button>
          </div>
        )}

        {showValidation && validationResult && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                padding: '24px 32px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
                    数据校验结果
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    共发现 {validationResult.errors.length} 个错误，{validationResult.warnings.length} 个警告
                  </p>
                </div>
                <button
                  onClick={() => setShowValidation(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div style={{
                padding: '24px 32px',
                overflowY: 'auto',
                flex: 1
              }}>
                {validationResult.errors.length === 0 && validationResult.warnings.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '48px',
                    color: '#10b981'
                  }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '16px' }}>
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
                      数据校验通过
                    </h3>
                    <p style={{ color: '#6b7280' }}>
                      所有数据都符合规范，可以安全导出
                    </p>
                  </div>
                ) : (
                  <>
                    {validationResult.errors.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          错误 ({validationResult.errors.length})
                        </h3>
                        <div style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '12px',
                          overflow: 'hidden'
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#fee2e2' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>优先级</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>规则编号</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>字段</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>行号</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>当前值</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>说明</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validationResult.errors.slice(0, 50).map((error, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #fecaca' }}>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7f1d1d' }}>
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      background: error.priority === 'P0' ? '#dc2626' : error.priority === 'P1' ? '#ea580c' : '#ca8a04',
                                      color: 'white'
                                    }}>
                                      {error.priority}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7f1d1d', fontFamily: 'monospace' }}>{error.ruleCode}</td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7f1d1d' }}>{error.fieldName}</td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7f1d1d' }}>{error.rowIndex + 1}</td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7f1d1d', fontFamily: 'monospace', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(error.currentValue)}</td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#7f1d1d' }}>{error.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {validationResult.errors.length > 50 && (
                            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#991b1b', background: '#fee2e2' }}>
                              还有 {validationResult.errors.length - 50} 个错误未显示...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {validationResult.warnings.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#d97706', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                          警告 ({validationResult.warnings.length})
                        </h3>
                        <div style={{
                          background: '#fffbeb',
                          border: '1px solid #fcd34d',
                          borderRadius: '12px',
                          overflow: 'hidden'
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#fef3c7' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#92400e', borderBottom: '1px solid #fcd34d' }}>优先级</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#92400e', borderBottom: '1px solid #fcd34d' }}>规则编号</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#92400e', borderBottom: '1px solid #fcd34d' }}>字段</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#92400e', borderBottom: '1px solid #fcd34d' }}>行号</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#92400e', borderBottom: '1px solid #fcd34d' }}>当前值</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#92400e', borderBottom: '1px solid #fcd34d' }}>说明</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validationResult.warnings.slice(0, 50).map((warning, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #fcd34d' }}>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#78350f' }}>
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      background: warning.priority === 'P0' ? '#dc2626' : warning.priority === 'P1' ? '#ea580c' : '#ca8a04',
                                      color: 'white'
                                    }}>
                                      {warning.priority}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#78350f', fontFamily: 'monospace' }}>{warning.ruleCode}</td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#78350f' }}>{warning.fieldName}</td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#78350f' }}>{warning.rowIndex + 1}</td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#78350f', fontFamily: 'monospace', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(warning.currentValue)}</td>
                                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#78350f' }}>{warning.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {validationResult.warnings.length > 50 && (
                            <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#92400e', background: '#fef3c7' }}>
                              还有 {validationResult.warnings.length - 50} 个警告未显示...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{
                padding: '16px 32px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  onClick={() => setShowValidation(false)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: '2px solid #e5e7eb',
                    background: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  关闭
                </button>
                {validationResult.errors.filter(e => e.priority === 'P0').length === 0 && (
                  <>
                    {validationResult.errors.length === 0 ? (
                      <button
                        onClick={() => {
                          setShowValidation(false);
                          download();
                        }}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: 'none',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                          transition: 'all 0.2s',
                          marginLeft: '12px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        确认导出
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowValidation(false);
                          download(true);
                        }}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          border: '2px solid #f59e0b',
                          background: '#fef3c7',
                          color: '#92400e',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          marginLeft: '12px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fde68a'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fef3c7'}
                      >
                        忽略错误并下载
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
