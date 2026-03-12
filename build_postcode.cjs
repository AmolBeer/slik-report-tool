const fs = require('fs');
const path = require('path');

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

// 生成完整的postcodes.ts文件
const tsContent = `import { CITY_MAP } from '../mappings';

/**
 * SLIK Postcode Mapping Module
 * Contains comprehensive District (Kecamatan) to Postcode relationships.
 * Disambiguates using City (Kabupaten/Kota) when necessary.
 * 
 * Data source: postcode.txt (7000+ Indonesian postcodes)
 */

// KECAMATAN (District) to Postcode mapping - 6825 entries
const KECAMATAN_POSTCODE_MAP = ${JSON.stringify(kecamatanMap, null, 2)};

// KELURAHAN (Village) to Postcode mapping - 488 entries
const KELURAHAN_POSTCODE_MAP = ${JSON.stringify(kelurahanMap, null, 2)};

// City to Postcode mapping - 488 entries
const CITY_POSTCODE_MAP = ${JSON.stringify(cityMap, null, 2)};

// Legacy postcode registry for backward compatibility
export const POSTCODE_REGISTRY = {
    // JAKARTA
    "GAMBIR": "10110",
    "TANAH ABANG": "10210",
    "MENTENG": "10310",
    "SENEN": "10410",
    "CEMPAKA PUTIH": "10510",
    "JOHAR BARU": "10530",
    "KEMAYORAN": "10610",
    "SAWAH BESAR": "10710",
    "TAMAN SARI": "11110",
    "TAMBORA": "11210",
    "PALMERAH": "11410",
    "GROGOL PETAMBURAN": "11440",
    "KEBON JERUK": "11510",
    "KEMBANGAN": "11610",
    "CENGKARENG": "11710",
    "KALIDERES": "11810",
    "KEBAYORAN BARU": "12110",
    "KEBAYORAN LAMA": "12210",
    "PESANGGRAHAN": "12250",
    "CILANDAK": "12410",
    "PASAR MINGGU": "12510",
    "JAGAKARSA": "12530",
    "MAMPANG PRAPATAN": "12710",
    "PANCORAN": "12740",
    "TEBET": "12810",
    "MENTENG DALAM": "12870",
    "SETIABUDI": "12910",
    "MATRAMAN": "13110",
    "PULOGADUNG": "13210",
    "JATINEGARA": { "JAKARTA TIMUR": "13310", "EAST JAKARTA": "13310", "TEGAL": "52473" },
    "DUREN SAWIT": "13430",
    "KRAMAT JATI": "13510",
    "MAKASAR": "13560",
    "PASAR REBO": "13710",
    "CIRACAS": "13720",
    "CIPAYUNG": { "JAKARTA TIMUR": "13840", "EAST JAKARTA": "13840", "DEPOK": "16436" },
    "CAKUNG": "13910",
    "CILINCING": "14110",
    "KOJA": "14210",
    "KELAPA GADING": "14240",
    "TANJUNG PRIOK": "14360",
    "PADEMANGAN": "14410",
    "PENJARINGAN": "14440",
    "SOUTH SERIBU ISLANDS": "14510",
    "NORTH SERIBU ISLANDS": "14530",
    // JAWA TIMUR
    "SURABAYA": "60111",
    "SAWAHAN": "60251",
    "SIDOARJO": "61211",
    "SEDATI": "61253",
    "KWANGSAN": "61253"
};

/**
 * Normalizes a location name for mapping.
 */
function normalize(val) {
    if (!val) return "";
    let clean = String(val).toUpperCase().trim();
    
    if (clean.startsWith('{')) {
        try {
            const obj = JSON.parse(clean);
            if (obj.city) clean = obj.city.toUpperCase().trim();
            else if (obj.name) clean = obj.name.toUpperCase().trim();
        } catch (e) {}
    }

    return clean
        .replace(/^(KOTA|KABUPATEN|KAB|PROVINSI|KECAMATAN|KEC|KELURAHAN|KEL)\\s+/g, "")
        .replace(/\\s+(CITY|REGENCY|DISTRICT|VILLAGE)$/g, "")
        .replace(/[^A-Z0-9\\s]/g, "")
        .trim();
}

/**
 * Get postcode by searching in order:
 * 1. KECAMATAN (District) - from postcode.txt data
 * 2. KELURAHAN (Village) - from postcode.txt data  
 * 3. CITY - from postcode.txt data
 * 4. Legacy POSTCODE_REGISTRY
 * 
 * @param kecamatan - Kecamatan/District name
 * @param kelurahan - Kelurahan/Village name (optional)
 * @param city - City/Kabupaten name (optional)
 * @returns Postcode string or null
 */
export function getPostcode(kecamatan, kelurahan, city) {
    const kec = kecamatan ? normalize(kecamatan) : "";
    const kel = kelurahan ? normalize(kelurahan) : "";
    const cty = city ? normalize(city) : "";
    
    console.log('[DEBUG getPostcode] 输入参数:', { kecamatan, kelurahan, city, kec, kel, cty });
    
    // 1. Try KECAMATAN first (from postcode.txt)
    if (kec) {
        if (KECAMATAN_POSTCODE_MAP[kec]) {
            console.log('[DEBUG getPostcode] 从KECAMATAN找到:', KECAMATAN_POSTCODE_MAP[kec]);
            return KECAMATAN_POSTCODE_MAP[kec];
        }
        // Try normalized version (remove spaces and special chars)
        const normalizedKec = kec.replace(/[^A-Z0-9]/g, '');
        for (const [key, code] of Object.entries(KECAMATAN_POSTCODE_MAP)) {
            if (key.replace(/[^A-Z0-9]/g, '') === normalizedKec) {
                console.log('[DEBUG getPostcode] KECAMATAN模糊匹配:', { key, code });
                return code;
            }
        }
    }
    
    // 2. Try KELURAHAN (from postcode.txt)
    if (kel) {
        if (KELURAHAN_POSTCODE_MAP[kel]) {
            console.log('[DEBUG getPostcode] 从KELURAHAN找到:', KELURAHAN_POSTCODE_MAP[kel]);
            return KELURAHAN_POSTCODE_MAP[kel];
        }
        // Try normalized version
        const normalizedKel = kel.replace(/[^A-Z0-9]/g, '');
        for (const [key, code] of Object.entries(KELURAHAN_POSTCODE_MAP)) {
            if (key.replace(/[^A-Z0-9]/g, '') === normalizedKel) {
                console.log('[DEBUG getPostcode] KELURAHAN模糊匹配:', { key, code });
                return code;
            }
        }
    }
    
    // 3. Try CITY (from postcode.txt)
    if (cty) {
        if (CITY_POSTCODE_MAP[cty]) {
            console.log('[DEBUG getPostcode] 从CITY找到:', CITY_POSTCODE_MAP[cty]);
            return CITY_POSTCODE_MAP[cty];
        }
        // Try normalized version
        const normalizedCity = cty.replace(/[^A-Z0-9]/g, '');
        for (const [key, code] of Object.entries(CITY_POSTCODE_MAP)) {
            if (key.replace(/[^A-Z0-9]/g, '') === normalizedCity) {
                console.log('[DEBUG getPostcode] CITY模糊匹配:', { key, code });
                return code;
            }
        }
    }
    
    // 4. Fallback to legacy POSTCODE_REGISTRY
    console.log('[DEBUG getPostcode] 使用Legacy查找');
    const district = kec || kel || "";
    if (!district) return null;
    
    const entry = POSTCODE_REGISTRY[district];
    if (entry) {
        if (typeof entry === 'string') {
            console.log('[DEBUG getPostcode] Legacy找到:', entry);
            return entry;
        }
        if (cty && entry[cty]) {
            console.log('[DEBUG getPostcode] Legacy城市匹配:', entry[cty]);
            return entry[cty];
        }
        const fallback = Object.values(entry)[0];
        console.log('[DEBUG getPostcode] Legacy默认:', fallback);
        return fallback;
    }
    
    // 5. Fuzzy match in legacy registry
    for (const [key, value] of Object.entries(POSTCODE_REGISTRY)) {
        if (key.includes(district) || district.includes(key)) {
            console.log('[DEBUG getPostcode] Legacy模糊匹配:', { key, value });
            if (typeof value === 'string') return value;
            if (cty && value[cty]) return value[cty];
            return Object.values(value)[0];
        }
    }
    
    console.log('[DEBUG getPostcode] 未找到匹配');
    return null;
}
`;

fs.writeFileSync('d:\\Projects\\vegetable-market-app\\SLIK-REPORT\\src\\postcodes.ts', tsContent);
console.log('\n文件已生成: src/postcodes.ts');
console.log('包含 6825 条KECAMATAN映射数据');
