import { 
  GENDER_MAP, MARITAL_MAP, EDUCATION_MAP, JOB_MAP, 
  INCOME_SOURCE_MAP, INCOME_BRACKET_MAP, OCCUPATION_TO_SECTOR_MAP, getCityCode 
} from './mappings';
import { getPostcode } from './src/postcodes';

export function cleanNum(val: any): string {
  if (val === undefined || val === null) return "";
  return String(val).trim().replace(/\[NULL\]/gi, "").replace(/[^\d]/g, "");
}

export function formatNIK(val: any): string {
  const s = cleanNum(val);
  return s.length >= 16 ? s.slice(0, 16) : s.padStart(16, '0');
}

export function formatDate(val: any): string {
  if (!val || String(val).toUpperCase() === "[NULL]") return "";
  
  // Handle Excel Serial
  if (typeof val === 'number' || (!isNaN(Number(val)) && String(val).length <= 6)) {
    const date = new Date((Math.floor(Number(val)) - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0,10).replace(/-/g, "");
    }
  }

  const s = String(val).trim().replace(/[-\/\.\s]/g, "");
  if (s.length === 8) return s;
  return s.replace(/[^\d]/g, "").slice(0, 8);
}

export function toYearlyIncome(val: any): string {
  const s = String(val || "").trim().toUpperCase();
  if (INCOME_BRACKET_MAP[s]) return Math.floor(INCOME_BRACKET_MAP[s] * 12).toString();
  const raw = parseFloat(s.replace(/[^\d.]/g, ""));
  return isNaN(raw) ? "0" : Math.floor(raw * 12).toString();
}

export function toAnnualInterest(val: any): string {
  const raw = String(val || "").trim().replace(/%/g, "").replace(/,/g, ".");
  const daily = parseFloat(raw);
  if (isNaN(daily)) return "0,00";
  const result = (daily * 360).toFixed(2);
  return result.replace(/\./g, ",");
}

export function formatInterest(val: any): string {
  const raw = String(val || "").trim().replace(/%/g, "");
  const num = parseFloat(raw);
  if (isNaN(num)) return "";
  return String(num).replace(/\./g, ",");
}

export function cleanName(val: any): string {
  const raw = String(val || "").trim();
  // 只保留字母、空格、中划线和单引号，其他字符替换为空格
  return raw.replace(/[^a-zA-Z\s\-']/g, " ").trim();
}

export function cleanAddress(val: any): string {
  const raw = String(val || "").trim();
  // 只保留字符、空格、数字、顿号、斜杠、中划线，其他字符替换为空格
  return raw.replace(/[^a-zA-Z0-9\s·/\-]/g, " ").trim();
}

export function getQuality(overdue: any): string {
  const days = parseInt(cleanNum(overdue)) || 0;
  if (days <= 0) return "1";
  if (days <= 30) return "2";
  if (days <= 60) return "3";
  if (days <= 90) return "4";
  return "5";
}

export function applyLogic(val: any, type: string | undefined, row?: any): string {
  // 确保row是一个对象，如果不是，则将其设置为undefined
  if (row === undefined || typeof row !== 'object' || row === null) {
    row = undefined;
  }
  const isNull = val === undefined || val === null || String(val).trim().toUpperCase() === "[NULL]" || String(val).trim() === "";
  const raw = String(val || "").trim().toUpperCase();

  // 添加调试日志
  if (type && ['education_code', 'gender_code', 'sector_code', 'occupation_code', 'city_code'].includes(type)) {
    console.log(`[DEBUG ${type}] 输入参数:`, { val, raw, type, row: row || 'undefined' });
  }

  if (isNull) {
     if (type === 'city_code' && row) {
       const cityVal = row?.['KABUPATEN/KOTA'] || row?.['KABUPATEN'] || row?.['KOTA'] || row?.['CITY'] || row?.['市代码'] || row?.['KABUPATENKOTA'] || row?.['DATI2'];
       if (cityVal) {
         const result = getCityCode(cityVal);
         console.log(`[DEBUG city_code] 兜底逻辑结果:`, { cityVal, result });
         // 如果找不到映射，返回原始值
         return result || String(cityVal).trim();
       }
     }
     if (type === 'sector_code' && row) {
       // BIDANG USAHA TEMPAT BEKERJA 由 Kode Pekerjaan（用户职业）字段映射
       const jobVal = row?.['Kode Pekerjaan'] || row?.['KODE PEKERJAAN'] || row?.['PEKERJAAN'] || row?.['OCCUPATION'] || row?.['JOB'] || "";
       if (jobVal) {
         const result = OCCUPATION_TO_SECTOR_MAP[String(jobVal).trim().toUpperCase()] || "009000";
         console.log(`[DEBUG sector_code] 兜底逻辑结果:`, { jobVal, result });
         return result;
       }
       return "009000";
     }
     if (type === 'zip_code' && row) {
       const kel = row?.['Kelurahan'] || row?.['KELURAHAN'] || row?.['村/社区'] || row?.['村'] || "";
       const kec = row?.['Kecamatan'] || row?.['KECAMATAN'] || row?.['镇/区'] || row?.['镇'] || "";
       const city = row?.['Kode Kabupaten atau Kota'] || row?.['KODE KABUPATEN/KOTA'] || row?.['KABUPATEN/KOTA'] || row?.['CITY'] || row?.['KABUPATEN'] || row?.['KOTA'] || row?.['KODEKABUPATENKOTA'] || row?.['市/县代码'] || "";
       
       // Priority: Kelurahan > Kecamatan
       const found = getPostcode("", kel, city) || getPostcode(kec, "", city);
       if (found) return found;

       const zip = row?.['Kode Pos'] || row?.['KODE POS'] || row?.['ZIP'] || row?.['邮政编码'] || "";
       if (/^\d{5}$/.test(String(zip).trim())) return String(zip).trim();
       
       return "";
     }
     if (type === 'amount' || type === 'raw_zero' || type === 'yearly_income') return "0";
     if (type === 'occupation_code') return "099";
     if (type === 'quality_code') return "1";
     if (type === 'income_source') return "1";
     if (type === 'education_code') return "00";
     if (type === 'sector_code') return "009000";
     return "";
  }

  switch (type) {
    case 'amount': return cleanNum(val) || "0";
    case 'raw_zero': return String(val).trim() || "0";
    case 'nik_16': return formatNIK(val);
    case 'clean_numeric': return cleanNum(val);
    case 'date': return formatDate(val);
    case 'yearly_income': return toYearlyIncome(val);
    case 'income_source': {
      const result = INCOME_SOURCE_MAP[raw] || "1";
      console.log(`[DEBUG income_source] 结果:`, { raw, result });
      return result;
    }
    case 'annual_interest': return toAnnualInterest(val);
    case 'format_interest': return formatInterest(val);
    case 'clean_name': return cleanName(val);
    case 'clean_address': return cleanAddress(val);
    case 'quality_code': return getQuality(val);
    case 'city_code': {
      const result = getCityCode(val);
      console.log(`[DEBUG city_code] 结果:`, { val, result });
      // 如果找不到映射，返回原始值
      return result || String(val || "").trim();
    }
    case 'zip_code': {
      console.log('[DEBUG zip_code] 输入参数:', { val, row: row || 'undefined' });
      // 获取KECAMATAN, KELURAHAN, CITY参数
      const kecamatan = row?.['Kecamatan'] || row?.['KECAMATAN'] || val || "";
      const kelurahan = row?.['Kelurahan'] || row?.['KELURAHAN'] || "";
      const city = row?.['Kode Kabupaten atau Kota'] || row?.['KABUPATEN/KOTA'] || row?.['CITY'] || row?.['KODE KABUPATEN/KOTA'] || row?.['KABUPATENKOTA'] || "";
      console.log('[DEBUG zip_code] 查找参数:', { kecamatan, kelurahan, city });
      const result = getPostcode(kecamatan, kelurahan, city);
      console.log('[DEBUG zip_code] 查找结果:', result);
      // 如果找不到，且原始值是5位数字，则使用原始值
      if (!result && String(val).length === 5 && /^\d{5}$/.test(String(val))) {
        return String(val);
      }
      return result || "";
    }
    case 'sector_code': {
      const result = OCCUPATION_TO_SECTOR_MAP[raw] || "009000";
      console.log(`[DEBUG sector_code] 结果:`, { raw, result });
      return result;
    }
    case 'occupation_code': {
      const result = JOB_MAP[raw] || "099";
      console.log(`[DEBUG occupation_code] 结果:`, { raw, result });
      return result;
    }
    case 'gender_code': {
      const result = GENDER_MAP[raw] || "L";
      console.log(`[DEBUG gender_code] 结果:`, { raw, result });
      return result;
    }
    case 'marital_code': {
      const result = MARITAL_MAP[raw] || "2";
      console.log(`[DEBUG marital_code] 结果:`, { raw, result });
      return result;
    }
    case 'education_code': {
      const result = EDUCATION_MAP[raw] || "00";
      console.log(`[DEBUG education_code] 结果:`, { raw, result });
      return result;
    }
    case 'phone': {
      let s = String(val).trim().replace(/[\s\-\+\(\)]/g, "");
      if (s.startsWith('08')) s = '628' + s.slice(2);
      else if (s.startsWith('8') && s.length > 7) s = '62' + s;
      return s.slice(-15);
    }
    default: return String(val).trim();
  }
}
