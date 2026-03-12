const fs = require('fs');
const path = require('path');

// 读取邮编文件
const content = fs.readFileSync('C:\\Users\\duhuanhuan01\\Downloads\\postcode.txt', 'utf-8');
const lines = content.split('\n');

// 解析数据 - 改进的数据结构
const kecamatanMap = {};  // 格式: { "DISTRICT": { "CITY": "POSTCODE", ... }, ... }
const kelurahanMap = {};  // 格式: { "VILLAGE": { "CITY": "POSTCODE", ... }, ... }
const cityMap = {};       // 格式: { "CITY": "POSTCODE" }

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
  
  // 添加到KECAMATAN映射（考虑城市区分）
  if (!kecamatanMap[district]) {
    kecamatanMap[district] = {};
  }
  kecamatanMap[district][city] = cleanPostcode;
  
  // 添加到KELURAHAN映射（考虑城市区分）
  if (!kelurahanMap[city]) {
    kelurahanMap[city] = {};
  }
  kelurahanMap[city][city] = cleanPostcode; // 城市本身作为kelurahan
  
  // 添加到城市映射
  if (!cityMap[city]) {
    cityMap[city] = cleanPostcode;
  }
}

console.log(`解析完成:`);
console.log(`  KECAMATAN映射: ${Object.keys(kecamatanMap).length} 个地区`);

// 统计有多个城市的地区
let multiCityDistricts = 0;
Object.entries(kecamatanMap).forEach(([district, cities]) => {
  if (Object.keys(cities).length > 1) {
    multiCityDistricts++;
  }
});
console.log(`  多城市地区: ${multiCityDistricts} 个`);
console.log(`  城市映射: ${Object.keys(cityMap).length} 个城市`);

// 生成完整的postcodes.ts文件
const tsContent = `import { CITY_MAP } from '../mappings';

/**
 * SLIK Postcode Mapping Module
 * Contains comprehensive District (Kecamatan) to Postcode relationships.
 * Disambiguates using City (Kabupaten/Kota) when necessary.
 * 
 * Data source: postcode.txt (7000+ Indonesian postcodes)
 */

// KECAMATAN (District) to Postcode mapping - with city disambiguation
const KECAMATAN_POSTCODE_MAP = ${JSON.stringify(kecamatanMap, null, 2)};

// KELURAHAN (Village) to Postcode mapping
const KELURAHAN_POSTCODE_MAP = ${JSON.stringify(kelurahanMap, null, 2)};

// City to Postcode mapping
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
 * 1. KECAMATAN (District) with City - from postcode.txt data
 * 2. KECAMATAN (District) without City - from postcode.txt data
 * 3. KELURAHAN (Village) with City - from postcode.txt data  
 * 4. KELURAHAN (Village) without City - from postcode.txt data
 * 5. CITY - from postcode.txt data
 * 6. Legacy POSTCODE_REGISTRY
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
    
    // 1. Try KECAMATAN with City (from postcode.txt)
    if (kec && cty) {
        if (KECAMATAN_POSTCODE_MAP[kec] && KECAMATAN_POSTCODE_MAP[kec][cty]) {
            console.log('[DEBUG getPostcode] 从KECAMATAN+城市找到:', KECAMATAN_POSTCODE_MAP[kec][cty]);
            return KECAMATAN_POSTCODE_MAP[kec][cty];
        }
        // Try normalized city
        const normalizedCity = cty.replace(/[^A-Z0-9]/g, '');
        if (KECAMATAN_POSTCODE_MAP[kec]) {
            for (const [cityKey, code] of Object.entries(KECAMATAN_POSTCODE_MAP[kec])) {
                if (cityKey.replace(/[^A-Z0-9]/g, '') === normalizedCity) {
                    console.log('[DEBUG getPostcode] KECAMATAN+城市模糊匹配:', { cityKey, code });
                    return code;
                }
            }
        }
    }
    
    // 2. Try KECAMATAN without City (from postcode.txt)
    if (kec) {
        if (KECAMATAN_POSTCODE_MAP[kec]) {
            // 如果只有一个城市，直接返回
            const cities = Object.keys(KECAMATAN_POSTCODE_MAP[kec]);
            if (cities.length === 1) {
                const code = KECAMATAN_POSTCODE_MAP[kec][cities[0]];
                console.log('[DEBUG getPostcode] 从KECAMATAN（唯一城市）找到:', code);
                return code;
            }
            // 尝试模糊匹配地区
            const normalizedKec = kec.replace(/[^A-Z0-9]/g, '');
            for (const [distKey, cityMap] of Object.entries(KECAMATAN_POSTCODE_MAP)) {
                if (distKey.replace(/[^A-Z0-9]/g, '') === normalizedKec) {
                    // 优先选择有城市匹配的
                    if (cty) {
                        for (const [cityKey, code] of Object.entries(cityMap)) {
                            if (cityKey.includes(cty) || cty.includes(cityKey)) {
                                console.log('[DEBUG getPostcode] KECAMATAN模糊匹配+城市:', { distKey, cityKey, code });
                                return code;
                            }
                        }
                    }
                    // 否则返回第一个
                    const firstCity = Object.keys(cityMap)[0];
                    const code = cityMap[firstCity];
                    console.log('[DEBUG getPostcode] KECAMATAN模糊匹配（默认城市）:', { distKey, firstCity, code });
                    return code;
                }
            }
        }
    }
    
    // 3. Try KELURAHAN with City (from postcode.txt)
    if (kel && cty) {
        if (KELURAHAN_POSTCODE_MAP[kel] && KELURAHAN_POSTCODE_MAP[kel][cty]) {
            console.log('[DEBUG getPostcode] 从KELURAHAN+城市找到:', KELURAHAN_POSTCODE_MAP[kel][cty]);
            return KELURAHAN_POSTCODE_MAP[kel][cty];
        }
    }
    
    // 4. Try KELURAHAN without City (from postcode.txt)
    if (kel) {
        if (KELURAHAN_POSTCODE_MAP[kel]) {
            // 如果只有一个城市，直接返回
            const cities = Object.keys(KELURAHAN_POSTCODE_MAP[kel]);
            if (cities.length === 1) {
                const code = KELURAHAN_POSTCODE_MAP[kel][cities[0]];
                console.log('[DEBUG getPostcode] 从KELURAHAN（唯一城市）找到:', code);
                return code;
            }
            // 尝试模糊匹配
            const normalizedKel = kel.replace(/[^A-Z0-9]/g, '');
            for (const [kelKey, cityMap] of Object.entries(KELURAHAN_POSTCODE_MAP)) {
                if (kelKey.replace(/[^A-Z0-9]/g, '') === normalizedKel) {
                    // 优先选择有城市匹配的
                    if (cty) {
                        for (const [cityKey, code] of Object.entries(cityMap)) {
                            if (cityKey.includes(cty) || cty.includes(cityKey)) {
                                console.log('[DEBUG getPostcode] KELURAHAN模糊匹配+城市:', { kelKey, cityKey, code });
                                return code;
                            }
                        }
                    }
                    // 否则返回第一个
                    const firstCity = Object.keys(cityMap)[0];
                    const code = cityMap[firstCity];
                    console.log('[DEBUG getPostcode] KELURAHAN模糊匹配（默认城市）:', { kelKey, firstCity, code });
                    return code;
                }
            }
        }
    }
    
    // 5. Try CITY (from postcode.txt)
    if (cty) {
        if (CITY_POSTCODE_MAP[cty]) {
            console.log('[DEBUG getPostcode] 从CITY找到:', CITY_POSTCODE_MAP[cty]);
            return CITY_POSTCODE_MAP[cty];
        }
        // Try normalized city
        const normalizedCity = cty.replace(/[^A-Z0-9]/g, '');
        for (const [cityKey, code] of Object.entries(CITY_POSTCODE_MAP)) {
            if (cityKey.replace(/[^A-Z0-9]/g, '') === normalizedCity) {
                console.log('[DEBUG getPostcode] CITY模糊匹配:', { cityKey, code });
                return code;
            }
        }
    }
    
    // 6. Fallback to legacy POSTCODE_REGISTRY
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
    
    // 7. Fuzzy match in legacy registry
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
console.log('包含城市区分的邮编映射');
