import { DataRow, SchemaField } from './types';
import { CITY_MAP, INCOME_SOURCE_MAP } from './mappings';

export interface ValidationError {
  ruleCode: string;
  ruleName: string;
  fieldName: string;
  rowIndex: number;
  currentValue: any;
  expectedValue: string;
  priority: 'P0' | 'P1' | 'P2';
  description: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationError[];
  isValid: boolean;
}

export interface ReportDate {
  year: string;
  month: string;
}

export function validateData(
  segmentsData: Record<string, DataRow[]>,
  schemaMap: Record<string, { schema: SchemaField[] }>,
  reportDate?: ReportDate
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  Object.entries(segmentsData).forEach(([segmentCode, rows]) => {
    const schema = schemaMap[segmentCode]?.schema;
    if (!schema) return;

    rows.forEach((row, rowIndex) => {
      if (!row) return;
      validateRow(row, rowIndex, schema, segmentCode, errors, warnings, reportDate);
    });
  });

  return {
    errors,
    warnings,
    isValid: errors.filter(e => e.priority === 'P0').length === 0
  };
}

function validateRow(
  row: DataRow,
  rowIndex: number,
  schema: SchemaField[],
  segmentCode: string,
  errors: ValidationError[],
  warnings: ValidationError[],
  reportDate?: ReportDate
) {
  schema.forEach(field => {
    const value = row[field.name];
    validateField(field, value, rowIndex, segmentCode, errors, warnings, row, reportDate);
  });
}

function validateField(
  field: SchemaField,
  value: any,
  rowIndex: number,
  segmentCode: string,
  errors: ValidationError[],
  warnings: ValidationError[],
  row?: DataRow,
  reportDate?: ReportDate
) {
  const fieldName = field.name;
  const fieldValue = String(value || '').trim();

  // R01-01: 姓名（NAMA SESUAI IDENTITAS）字符限制
  if (fieldName === 'NAMA SESUAI IDENTITAS') {
    if (!/^[A-Z\s\-']+$/.test(fieldValue)) {
      errors.push({
        ruleCode: 'R01-01',
        ruleName: '字段格式合规',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '字母、空格、-、\'（仅这4类）',
        priority: 'P1',
        description: '姓名含, .等符号（如 ST, ST）；纯数字/纯空格；其他特殊符号'
      });
    }
  }

  // R01-02: 出生地（TEMPAT LAHIR KTP）字符限制
  if (fieldName === 'TEMPAT LAHIR') {
    if (!/^[A-Z0-9\s\-]+$/.test(fieldValue)) {
      errors.push({
        ruleCode: 'R01-02',
        ruleName: '字段格式合规',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '字母、数字、空格、-（仅这4类）',
        priority: 'P1',
        description: '含.等符号（如 B. LAMPUNG）；纯特殊符号/纯空格'
      });
    }
  }

  // R01-03: 编码类字段（市县编码、婚姻状况、邮编）格式
  if (['KODE KABUPATEN/KOTA', 'STATUS PERKAWINAN', 'KODE POS'].includes(fieldName)) {
    if (!/^\d+$/.test(fieldValue) && fieldValue !== '' && fieldValue !== 'NULL') {
      errors.push({
        ruleCode: 'R01-03',
        ruleName: '字段格式合规',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '纯数字（无字母/符号/NULL）',
        priority: 'P1',
        description: '婚姻状况填WIDOWED（英文）；邮编填NULL；市县编码含字母'
      });
    }
  }

  // R01-04: 字段长度阈值
  if (fieldName === 'STATUS PERKAWINAN' && fieldValue.length > 1) {
    errors.push({
      ruleCode: 'R01-04',
      ruleName: '字段长度阈值',
      fieldName,
      rowIndex,
      currentValue: fieldValue,
      expectedValue: '婚姻状况≤1位',
      priority: 'P2',
      description: '婚姻状况填英文单词（长度超1位）'
    });
  }

  if (fieldName === 'KODE POS' && fieldValue.length > 0 && fieldValue.length < 5) {
    errors.push({
      ruleCode: 'R01-04',
      ruleName: '字段长度阈值',
      fieldName,
      rowIndex,
      currentValue: fieldValue,
      expectedValue: '邮编≥5位',
      priority: 'P2',
      description: '邮编仅3位'
    });
  }

  // R02-01: 核心字段必填
  if (['KODE KABUPATEN/KOTA', 'TEMPAT BEKERJA'].includes(fieldName)) {
    if (!fieldValue || fieldValue === '' || fieldValue === 'NULL') {
      errors.push({
        ruleCode: 'R02-01',
        ruleName: '必填项完整性',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '需填有效值',
        priority: 'P0',
        description: '市县编码空值/NULL；工作单位未填写'
      });
    }
  }

  // R03-01: 编码类字段需匹配系统参考字典
  if (fieldName === 'KODE SUMBER PENGHASILAN') {
    const validValues = Object.values(INCOME_SOURCE_MAP);
    if (fieldValue && !validValues.includes(fieldValue)) {
      errors.push({
        ruleCode: 'R03-01',
        ruleName: '参考数据匹配',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '需在系统参考表中存在',
        priority: 'P1',
        description: '资金来源填无效值'
      });
    }
  }

  if (fieldName === 'KODE KABUPATEN/KOTA') {
    const validCityCodes = Object.values(CITY_MAP);
    if (fieldValue && !validCityCodes.includes(fieldValue)) {
      errors.push({
        ruleCode: 'R03-01',
        ruleName: '参考数据匹配',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '需在系统参考表中存在',
        priority: 'P1',
        description: '市县编码填非标编码'
      });
    }
  }

  // R04-01: 核心标识唯一（需要在全局范围内检查）
  // 这个需要在所有数据处理完成后进行全局唯一性检查

  // R05-01: 逾期金额与天数/频率强关联
  if (segmentCode === 'F01') {
    const overdueAmount = parseFloat(row['JUMLAH HARI LEBIH JATU TEMPO'] || '0');
    const overdueDays = parseInt(row['JUMLAH HARI LEBIH JATU TEMPO'] || '0');
    const overdueFrequency = parseInt(row['FREKUENSI LEBIH JATU TEMPO'] || '0');

    if (overdueAmount > 0 && (overdueDays === 0 || overdueFrequency === 0)) {
      errors.push({
        ruleCode: 'R05-01',
        ruleName: '业务逻辑一致性',
        fieldName: 'JUMLAH HARI LEBIH JATU TEMPO',
        rowIndex,
        currentValue: `金额=${overdueAmount}, 天数=${overdueDays}, 频率=${overdueFrequency}`,
        expectedValue: '本金/利息逾期金额＞0 → 逾期天数/频率＞0',
        priority: 'P1',
        description: '有逾期金额但天数=0；天数＞0但频率=0'
      });
    }
  }

  // R05-02: 状态与罚款金额匹配
  if (segmentCode === 'F01') {
    const status = row['KODE KONDISI'];
    const penalty = parseFloat(row['DENDA'] || '0');

    if ((status === '02' || status === '12') && penalty !== 0) {
      errors.push({
        ruleCode: 'R05-02',
        ruleName: '业务逻辑一致性',
        fieldName: 'DENDA',
        rowIndex,
        currentValue: penalty,
        expectedValue: '罚款=0',
        priority: 'P1',
        description: '状态02（结清）/12（折扣结清）但罚款≠0'
      });
    }
  }

  // R05-03: 状态与逾期金额匹配
  if (segmentCode === 'F01') {
    const status = row['KODE KONDISI'];
    const overdueAmount = parseFloat(row['JUMLAH HARI LEBIH JATU TEMPO'] || '0');

    if ((status === '02' || status === '12') && overdueAmount > 0) {
      errors.push({
        ruleCode: 'R05-03',
        ruleName: '业务逻辑一致性',
        fieldName: 'JUMLAH HARI LEBIH JATU TEMPO',
        rowIndex,
        currentValue: overdueAmount,
        expectedValue: '逾期金额=0',
        priority: 'P1',
        description: '状态02但本金逾期金额＞0'
      });
    }

    if (status === '04' && overdueAmount === 0) {
      errors.push({
        ruleCode: 'R05-03',
        ruleName: '业务逻辑一致性',
        fieldName: 'JUMLAH HARI LEBIH JATU TEMPO',
        rowIndex,
        currentValue: overdueAmount,
        expectedValue: '逾期金额＞0',
        priority: 'P1',
        description: '状态04（坏账）但逾期金额=0'
      });
    }
  }

  // R06-01: 日期先后顺序
  if (segmentCode === 'F01') {
    const contractDate = row['TANGGAL MULAI KONTRAK'];
    const creditStartDate = row['TANGGAL MULAI KREDIT'];
    const statusDate = row['TANGGAL STATUS'];

    if (contractDate && creditStartDate && statusDate) {
      const contract = parseDate(contractDate);
      const start = parseDate(creditStartDate);
      const status = parseDate(statusDate);

      if (contract > start) {
        errors.push({
          ruleCode: 'R06-01',
          ruleName: '日期逻辑',
          fieldName: 'TANGGAL MULAI KONTRAK',
          rowIndex,
          currentValue: contractDate,
          expectedValue: '合同生效日期≤信贷起始日期',
          priority: 'P1',
          description: '合同生效日期＞信贷起始日期'
        });
      }

      if (start > status) {
        errors.push({
          ruleCode: 'R06-01',
          ruleName: '日期逻辑',
          fieldName: 'TANGGAL STATUS',
          rowIndex,
          currentValue: statusDate,
          expectedValue: '状态日期≥信贷起始日期',
          priority: 'P1',
          description: '状态日期早于信贷起始日期'
        });
      }
    }
  }

  // R06-02: 状态日期范围限制
  if (segmentCode === 'F01' && fieldName === 'TANGGAL STATUS') {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const statusDate = parseDate(fieldValue);

    if (statusDate) {
      const statusYear = parseInt(fieldValue.substring(0, 4));
      const statusMonth = parseInt(fieldValue.substring(4, 6));

      if (statusYear > currentYear || (statusYear === currentYear && statusMonth > currentMonth)) {
        warnings.push({
          ruleCode: 'R06-02',
          ruleName: '日期逻辑',
          fieldName,
          rowIndex,
          currentValue: fieldValue,
          expectedValue: '状态日期≤数据提交月份',
          priority: 'P2',
          description: '1月提交数据但状态日期为2月'
        });
      }
    }
  }

  // R06-03: 日期格式规范
  if (['TANGGAL LAHIR', 'TANGGAL STATUS', 'TANGGAL MULAI KONTRAK', 'TANGGAL MULAI KREDIT'].includes(fieldName)) {
    if (fieldValue && !/^\d{8}$/.test(fieldValue)) {
      errors.push({
        ruleCode: 'R06-03',
        ruleName: '日期逻辑',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '统一为YYYYMMDD（如20260101）',
        priority: 'P2',
        description: '非标准格式（如2026-01-01、01/01/2026）'
      });
    }
  }

  // R07-01: 货币编码 = IDR 时，原货币金额需空
  if (segmentCode === 'F01' && fieldName === 'KODE MATA UANG ASAL') {
    if (fieldValue === 'IDR' && row['NILAI DALAM MATA UANG ASAL']) {
      errors.push({
        ruleCode: 'R07-01',
        ruleName: '字段状态冲突',
        fieldName: 'NILAI DALAM MATA UANG ASAL',
        rowIndex,
        currentValue: row['NILAI DALAM MATA UANG ASAL'],
        expectedValue: '留空',
        priority: 'P2',
        description: '货币为IDR但填写原货币金额'
      });
    }
  }

  // R07-02: 信贷性质编码≠2 时，承接自字段需空
  if (segmentCode === 'F01' && fieldName === 'TAKEOVER DARI') {
    const creditNature = row['KODE BAKI KREDIT'];
    if (creditNature !== '2' && fieldValue) {
      errors.push({
        ruleCode: 'R07-02',
        ruleName: '字段状态冲突',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '留空',
        priority: 'P2',
        description: '信贷性质编码=3但填写承接自信息'
      });
    }
  }

  // R07-03: 质量编码≠5 时，逾期日期/原因需空
  if (segmentCode === 'F01' && ['TANGGAL MACET', 'KODE SEBAB MACET'].includes(fieldName)) {
    const qualityCode = row['KODE KUALITAS'];
    if (qualityCode !== '5' && fieldValue) {
      errors.push({
        ruleCode: 'R07-03',
        ruleName: '字段状态冲突',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '留空',
        priority: 'P2',
        description: '质量编码=3但填写逾期日期'
      });
    }
  }

  // R08-01: 初始信贷额度需有效
  if (segmentCode === 'F01' && fieldName === 'PLAFON AWAL') {
    const plafonAwal = parseFloat(fieldValue) || 0;
    if (plafonAwal <= 0) {
      errors.push({
        ruleCode: 'R08-01',
        ruleName: '数值有效性',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '初始额度＞0',
        priority: 'P1',
        description: '初始额度=0或负数'
      });
    }
  }

  // R08-02: 逾期相关数值非负
  if (segmentCode === 'F01' && ['JUMLAH HARI LEBIH JATU TEMPO', 'FREKUENSI LEBIH JATU TEMPO'].includes(fieldName)) {
    const numValue = parseInt(fieldValue) || 0;
    if (numValue < 0) {
      errors.push({
        ruleCode: 'R08-02',
        ruleName: '数值有效性',
        fieldName,
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '非负整数',
        priority: 'P2',
        description: '逾期天数=-5；频率为负数'
      });
    }
  }

  // R09-01: KODE KONDISI=00/01/03（正常/取消/销账）
  if (segmentCode === 'F01' && ['JUMLAH HARI LEBIH JATU TEMPO', 'JUMLAH FREKUENSI LEBIH JATU TEMPO', 'DENDA'].includes(fieldName)) {
    const status = row['KODE KONDISI'];
    const overdueAmount = parseFloat(row['JUMLAH HARI LEBIH JATU TEMPO'] || '0');
    const overdueDays = parseInt(row['JUMLAH HARI LEBIH JATU TEMPO'] || '0');
    const overdueFrequency = parseInt(row['FREKUENSI LEBIH JATU TEMPO'] || '0');
    const penalty = parseFloat(row['DENDA'] || '0');

    if (status === '00' || status === '01' || status === '03') {
      if (overdueAmount !== 0 || overdueDays !== 0 || overdueFrequency !== 0 || penalty !== 0) {
        errors.push({
          ruleCode: 'R09-01',
          ruleName: '核心状态专项规则',
          fieldName,
          rowIndex,
          currentValue: `金额=${overdueAmount}, 天数=${overdueDays}, 频率=${overdueFrequency}, 罚款=${penalty}`,
          expectedValue: '逾期金额、天数、频率、罚款均=0',
          priority: 'P1',
          description: '状态00但逾期金额＞0'
        });
      }
    }
  }

  // R09-02: KODE KONDISI=02/12（结清/折扣结清）
  if (segmentCode === 'F01' && fieldName === 'DENDA') {
    const status = row['KODE KONDISI'];
    const penalty = parseFloat(fieldValue) || '0';
    const overdueDays = parseInt(row['JUMLAH HARI LEBIH JATU TEMPO'] || '0');
    const overdueFrequency = parseInt(row['FREKUENSI LEBIH JATU TEMPO'] || '0');

    if (status === '02' || status === '12') {
      if (penalty !== 0) {
        errors.push({
          ruleCode: 'R09-02',
          ruleName: '核心状态专项规则',
          fieldName,
          rowIndex,
          currentValue: penalty,
          expectedValue: '罚款=0',
          priority: 'P1',
          description: '状态02但罚款＞0'
        });
      }
      if (overdueDays === 0) {
        warnings.push({
          ruleCode: 'R09-02',
          ruleName: '核心状态专项规则',
          fieldName: 'JUMLAH HARI LEBIH JATU TEMPO',
          rowIndex,
          currentValue: overdueDays,
          expectedValue: '历史逾期天数填实际值',
          priority: 'P1',
          description: '有历史逾期但天数=0'
        });
      }
      if (overdueFrequency === 0) {
        warnings.push({
          ruleCode: 'R09-02',
          ruleName: '核心状态专项规则',
          fieldName: 'FREKUENSI LEBIH JATU TEMPO',
          rowIndex,
          currentValue: overdueFrequency,
          expectedValue: '历史逾期频率填实际值',
          priority: 'P1',
          description: '有历史逾期但频率=0'
        });
      }
    }
  }

  // R09-03: KODE KONDISI=04（坏账）
  if (segmentCode === 'F01') {
    const status = row['KODE KONDISI'];
    const overdueAmount = parseFloat(row['JUMLAH HARI LEBIH JATU TEMPO'] || '0');
    const overdueDays = parseInt(row['JUMLAH HARI LEBIH JATU TEMPO'] || '0');
    const overdueFrequency = parseInt(row['FREKUENSI LEBIH JATU TEMPO'] || '0');
    const penalty = parseFloat(row['DENDA'] || '0');
    const qualityCode = row['KODE KUALITAS'];

    if (status === '04') {
      if (overdueAmount === 0 || overdueDays === 0 || overdueFrequency === 0 || penalty === 0) {
        errors.push({
          ruleCode: 'R09-03',
          ruleName: '核心状态专项规则',
          fieldName: 'JUMLAH HARI LEBIH JATU TEMPO',
          rowIndex,
          currentValue: overdueAmount,
          expectedValue: '逾期金额、天数、频率、罚款均＞0',
          priority: 'P1',
          description: '状态04但逾期金额=0'
        });
      }
      if (qualityCode !== '5') {
        errors.push({
          ruleCode: 'R09-03',
          ruleName: '核心状态专项规则',
          fieldName: 'KODE KUALITAS',
          rowIndex,
          currentValue: qualityCode,
          expectedValue: '质量编码=5',
          priority: 'P1',
          description: '质量编码≠5'
        });
      }
    }
  }

  // R10-01: F01段 - TANGGAL KONDISI必须与上报月份一致
  if (segmentCode === 'F01' && fieldName === 'TANGGAL KONDISI' && reportDate) {
    const conditionDate = fieldValue;
    if (conditionDate && conditionDate.length === 8) {
      const conditionYear = conditionDate.substring(0, 4);
      const conditionMonth = conditionDate.substring(4, 6);
      if (conditionYear !== reportDate.year || conditionMonth !== reportDate.month) {
        errors.push({
          ruleCode: 'R10-01',
          ruleName: '日期逻辑',
          fieldName: 'TANGGAL KONDISI',
          rowIndex,
          currentValue: `${conditionYear}-${conditionMonth}`,
          expectedValue: `${reportDate.year}-${reportDate.month}`,
          priority: 'P0',
          description: '状况日期与上报月份不一致'
        });
      }
    }
  }

  // R10-02: F01段 - NILAI PROYEK必须为空
  if (segmentCode === 'F01' && fieldName === 'NILAI PROYEK') {
    if (fieldValue && fieldValue.trim() !== '') {
      errors.push({
        ruleCode: 'R10-02',
        ruleName: '字段必填性',
        fieldName: 'NILAI PROYEK',
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '空',
        priority: 'P1',
        description: 'NILAI PROYEK必须为空'
      });
    }
  }

  // R10-03: F01段 - NILAI DALAM MATA UANG ASAL必须为空
  if (segmentCode === 'F01' && fieldName === 'NILAI DALAM MATA UANG ASAL') {
    if (fieldValue && fieldValue.trim() !== '') {
      errors.push({
        ruleCode: 'R10-03',
        ruleName: '字段必填性',
        fieldName: 'NILAI DALAM MATA UANG ASAL',
        rowIndex,
        currentValue: fieldValue,
        expectedValue: '空',
        priority: 'P1',
        description: 'NILAI DALAM MATA UANG ASAL必须为空'
      });
    }
  }

  // R10-04: F01段 - BAKI DEBET不能为空
  if (segmentCode === 'F01' && fieldName === 'BAKI DEBET') {
    if (!fieldValue || fieldValue.trim() === '') {
      errors.push({
        ruleCode: 'R10-04',
        ruleName: '字段必填性',
        fieldName: 'BAKI DEBET',
        rowIndex,
        currentValue: fieldValue || '空',
        expectedValue: '非空数字',
        priority: 'P0',
        description: 'BAKI DEBET不能为空'
      });
    }
  }

  // R10-05: D01和F01段 - KODE KABUPATEN/KOTA不能为空
  if ((segmentCode === 'D01' || segmentCode === 'F01') && fieldName === 'KODE KABUPATEN/KOTA') {
    if (!fieldValue || fieldValue.trim() === '') {
      errors.push({
        ruleCode: 'R10-05',
        ruleName: '字段必填性',
        fieldName: 'KODE KABUPATEN/KOTA',
        rowIndex,
        currentValue: fieldValue || '空',
        expectedValue: '非空城市代码',
        priority: 'P0',
        description: `${segmentCode}段城市代码不能为空`
      });
    }
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}

export function validateUniqueness(segmentsData: Record<string, DataRow[]>): ValidationError[] {
  const errors: ValidationError[] = [];

  // 全局CIF号检查（所有段）
  // D01段的特殊检查：身份证号和UID的绑定关系
  const d01NikToUidMap: Record<string, string> = {};

  Object.entries(segmentsData).forEach(([segmentCode, rows]) => {
    rows.forEach((row, rowIndex) => {
      if (!row) return;
      const cif = row['NOMOR CIF DEBITUR'];
      const nik = row['NOMOR IDENTITAS'];
      const passport = row['NOMOR PASPOR'];
      const uid = row['UID'] || row['ID'] || row['USER ID'] || row['用户ID'];

      // 只在D01段中检查CIF号的唯一性
      if (segmentCode === 'D01') {
        // D01段：CIF号需要唯一
        if (cif && Object.values(d01NikToUidMap).includes(cif)) {
          errors.push({
            ruleCode: 'R04-03',
            ruleName: '数据唯一性',
            fieldName: 'NOMOR CIF DEBITUR',
            rowIndex: rowIndex,
            currentValue: cif,
            expectedValue: '唯一不重复',
            priority: 'P0',
            description: '同一CIF号多次录入'
          });
        }
        
        // 存储CIF号到映射表中，确保唯一性
        if (cif) {
          d01NikToUidMap[cif] = cif;
        }
      }

      // D01段特殊检查：身份证号不能绑定多个UID
      if (segmentCode === 'D01') {
        // 获取CIF号
        const cif = row?.['NOMOR CIF DEBITUR'] ? String(row['NOMOR CIF DEBITUR']).trim() : '';
        
        if (nik && uid) {
          if (d01NikToUidMap[nik]) {
            if (d01NikToUidMap[nik] !== uid) {
              errors.push({
                ruleCode: 'R04-02',
                ruleName: '数据唯一性',
                fieldName: 'NOMOR IDENTITAS',
                rowIndex: rowIndex,
                currentValue: `${nik} (绑定UID: ${uid})`,
                expectedValue: '唯一UID绑定',
                priority: 'P0',
                description: '同一身份证号绑定多个UID'
              });
            }
          } else {
            d01NikToUidMap[nik] = uid;
          }
        }

        // D01段：身份证号和护照号都需要唯一
        if (nik && Object.values(d01NikToUidMap).includes(nik)) {
          errors.push({
            ruleCode: 'R04-01',
            ruleName: '数据唯一性',
            fieldName: 'NOMOR IDENTITAS',
            rowIndex: rowIndex,
            currentValue: nik,
            expectedValue: '唯一不重复',
            priority: 'P0',
            description: '同一身份证号多次录入'
          });
        }

        if (passport && Object.values(d01NikToUidMap).includes(passport)) {
          errors.push({
            ruleCode: 'R04-01',
            ruleName: '数据唯一性',
            fieldName: 'NOMOR PASPOR',
            rowIndex: rowIndex,
            currentValue: passport,
            expectedValue: '唯一不重复',
            priority: 'P0',
            description: '同一护照号多次录入'
          });
        }
        
        // 存储身份证号和护照号到映射表中，确保唯一性
        if (nik) {
          d01NikToUidMap[nik] = nik;
        }
        if (passport) {
          d01NikToUidMap[passport] = passport;
        }
      }
      
      // F01段：允许同一个UID或证件号码多次出现（因为一个人可能存在多笔订单）
      // 所以这里不需要对F01段的UID和证件号码进行唯一性检查
    });
  });

  return errors;
}
