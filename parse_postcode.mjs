import * as fs from 'fs';

// 读取邮编文件
const content = fs.readFileSync('C:\\Users\\duhuanhuan01\\Downloads\\postcode.txt', 'utf-8');
const lines = content.split('\n');

// 解析数据
const kecamatanMap = {};  // 根据KECAMATAN查找
const kelurahanMap = {};  // 根据KELURAHAN查找
const cityMap = {};       // 根据城市查找

// 跳过标题行
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // 按制表符分割
  const parts = line.split('\t');
  if (parts.length < 3) continue;
  
  const city = parts[0].trim().toUpperCase();
  const district = parts[1].trim().toUpperCase();
  const postcode = parts[2].trim();
  
  if (!postcode) continue;
  
  // 清理邮编（只保留数字）
  const cleanPostcode = postcode.replace(/\D/g, '');
  if (cleanPostcode.length !== 5) continue;
  
  // 添加到KECAMATAN映射（district对应KECAMATAN）
  if (!kecamatanMap[district]) {
    kecamatanMap[district] = cleanPostcode;
  }
  
  // 添加到KELURAHAN映射（city可能包含kelurahan信息）
  if (!kelurahanMap[city]) {
    kelurahanMap[city] = cleanPostcode;
  }
  
  // 添加到城市映射
  if (!cityMap[city]) {
    cityMap[city] = cleanPostcode;
  }
}

console.log(`解析完成:`);
console.log(`  KECAMATAN映射: ${Object.keys(kecamatanMap).length} 条`);
console.log(`  KELURAHAN映射: ${Object.keys(kelurahanMap).length} 条`);
console.log(`  城市映射: ${Object.keys(cityMap).length} 条`);

// 生成TypeScript文件
const tsContent = `/**
 * Postcode Lookup Module
 * Generated from postcode.txt
 * Contains Indonesian postcode mappings
 */

// KECAMATAN (District) to Postcode mapping
export const KECAMATAN_POSTCODE_MAP: Record<string, string> = ${JSON.stringify(kecamatanMap, null, 2)};

// KELURAHAN (Village) to Postcode mapping
export const KELURAHAN_POSTCODE_MAP: Record<string, string> = ${JSON.stringify(kelurahanMap, null, 2)};

// City to Postcode mapping
export const CITY_POSTCODE_MAP: Record<string, string> = ${JSON.stringify(cityMap, null, 2)};

/**
 * Get postcode by searching in order:
 * 1. KECAMATAN (District)
 * 2. KELURAHAN (Village)
 * 3. City
 */
export function getPostcodeFromFile(kecamatan?: string, kelurahan?: string, city?: string): string {
  if (!kecamatan && !kelurahan && !city) return "";
  
  // 1. Try KECAMATAN first
  if (kecamatan) {
    const kecKey = kecamatan.trim().toUpperCase();
    if (KECAMATAN_POSTCODE_MAP[kecKey]) {
      return KECAMATAN_POSTCODE_MAP[kecKey];
    }
    // Try normalized version
    const normalizedKec = kecKey.replace(/[^A-Z0-9]/g, '');
    for (const [key, code] of Object.entries(KECAMATAN_POSTCODE_MAP)) {
      if (key.replace(/[^A-Z0-9]/g, '') === normalizedKec) {
        return code;
      }
    }
  }
  
  // 2. Try KELURAHAN
  if (kelurahan) {
    const kelKey = kelurahan.trim().toUpperCase();
    if (KELURAHAN_POSTCODE_MAP[kelKey]) {
      return KELURAHAN_POSTCODE_MAP[kelKey];
    }
    // Try normalized version
    const normalizedKel = kelKey.replace(/[^A-Z0-9]/g, '');
    for (const [key, code] of Object.entries(KELURAHAN_POSTCODE_MAP)) {
      if (key.replace(/[^A-Z0-9]/g, '') === normalizedKel) {
        return code;
      }
    }
  }
  
  // 3. Try City
  if (city) {
    const cityKey = city.trim().toUpperCase();
    if (CITY_POSTCODE_MAP[cityKey]) {
      return CITY_POSTCODE_MAP[cityKey];
    }
    // Try normalized version
    const normalizedCity = cityKey.replace(/[^A-Z0-9]/g, '');
    for (const [key, code] of Object.entries(CITY_POSTCODE_MAP)) {
      if (key.replace(/[^A-Z0-9]/g, '') === normalizedCity) {
        return code;
      }
    }
  }
  
  return "";
}
`;

fs.writeFileSync('d:\\Projects\\vegetable-market-app\\SLIK-REPORT\\src\\postcodes_new.ts', tsContent);
console.log('\n文件已生成: src/postcodes_new.ts');
