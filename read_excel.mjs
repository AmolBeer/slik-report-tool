import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'C:\\Users\\duhuanhuan01\\Downloads\\slik_template.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('=== 所有工作表名称 ===');
console.log(workbook.SheetNames);

console.log('\n=== D01 工作表列名 ===');
const d01Sheet = workbook.Sheets['D01'] || workbook.Sheets['DEBITUR'] || workbook.Sheets['DEBITUR PERSEORANGAN'];
if (d01Sheet) {
  const jsonData = XLSX.utils.sheet_to_json(d01Sheet, { defval: "" });
  console.log('D01 数据行数:', jsonData.length);
  if (jsonData.length > 0) {
    console.log('D01 所有列名:', Object.keys(jsonData[0]));
    console.log('\n=== D01 第一行数据 ===');
    console.log(JSON.stringify(jsonData[0], null, 2));
  }
} else {
  console.log('未找到 D01 工作表');
}

console.log('\n=== F01 工作表列名 ===');
const f01Sheet = workbook.Sheets['F01'] || workbook.Sheets['FASILITAS'] || workbook.Sheets['FASILITAS KREDIT'];
if (f01Sheet) {
  const jsonData = XLSX.utils.sheet_to_json(f01Sheet, { defval: "" });
  console.log('F01 数据行数:', jsonData.length);
  if (jsonData.length > 0) {
    console.log('F01 所有列名:', Object.keys(jsonData[0]));
    console.log('\n=== F01 第一行数据 ===');
    console.log(JSON.stringify(jsonData[0], null, 2));
  }
} else {
  console.log('未找到 F01 工作表');
}

console.log('\n=== 所有工作表的列名 ===');
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  console.log(`\n${sheetName}:`);
  console.log('  行数:', jsonData.length);
  if (jsonData.length > 0) {
    console.log('  列名:', Object.keys(jsonData[0]).join(', '));
  }
});