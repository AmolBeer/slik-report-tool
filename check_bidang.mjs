import xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const filePath = 'C:\\Users\\duhuanhuan01\\Downloads\\slik_template.xlsx';

console.log('正在读取Excel文件...');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet, { raw: false });

console.log(`\n总行数: ${jsonData.length}`);
console.log('\n所有字段名称:');
const allFields = Object.keys(jsonData[0]);
allFields.forEach(field => {
  console.log(`  "${field}"`);
});

console.log('\n查找包含"Bidang"或"Usaha"的字段:');
const bidangFields = allFields.filter(field => 
  field.toLowerCase().includes('bidang') || 
  field.toLowerCase().includes('usaha')
);
console.log('找到的字段:', bidangFields);

console.log('\n前5行的"Bidang Usaha Tempat Bekerja"字段值:');
for (let i = 0; i < Math.min(5, jsonData.length); i++) {
  const row = jsonData[i];
  console.log(`行 ${i + 1}: "${row['Bidang Usaha Tempat Bekerja']}"`);
}

console.log('\n前5行的"Kode Bidang Usaha"字段值:');
for (let i = 0; i < Math.min(5, jsonData.length); i++) {
  const row = jsonData[i];
  console.log(`行 ${i + 1}: "${row['Kode Bidang Usaha']}"`);
}

console.log('\n前5行的所有字段值:');
for (let i = 0; i < Math.min(3, jsonData.length); i++) {
  console.log(`\n行 ${i + 1}:`);
  Object.entries(jsonData[i]).forEach(([key, value]) => {
    console.log(`  ${key}: "${value}"`);
  });
}
