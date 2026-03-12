import XLSX from 'xlsx';

const filePath = 'C:\\Users\\duhuanhuan01\\Downloads\\slik_template.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('=== D01 工作表性别数据 ===');
const d01Sheet = workbook.Sheets['D01'];
if (d01Sheet) {
  const jsonData = XLSX.utils.sheet_to_json(d01Sheet, { defval: "" });
  console.log('D01 数据行数:', jsonData.length);

  // 查看前10行的性别数据
  console.log('\n前10行的性别数据:');
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    console.log(`行 ${i}: Jenis Kelamin = "${row['Jenis Kelamin']}"`);
  }

  // 统计所有性别值的分布
  const genderValues = {};
  jsonData.forEach(row => {
    const gender = row['Jenis Kelamin'];
    genderValues[gender] = (genderValues[gender] || 0) + 1;
  });
  console.log('\n性别值分布:');
  Object.entries(genderValues).forEach(([value, count]) => {
    console.log(`  "${value}": ${count} 行`);
  });

  // 查看前10行的教育程度数据
  console.log('\n前10行的教育程度数据:');
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    console.log(`行 ${i}: Kode Status Pendidikan = "${row['Kode Status Pendidikan']}"`);
  }

  // 统计所有教育程度值的分布
  const educationValues = {};
  jsonData.forEach(row => {
    const edu = row['Kode Status Pendidikan'];
    educationValues[edu] = (educationValues[edu] || 0) + 1;
  });
  console.log('\n教育程度值分布:');
  Object.entries(educationValues).forEach(([value, count]) => {
    console.log(`  "${value}": ${count} 行`);
  });

  // 查看前10行的职业数据
  console.log('\n前10行的职业数据:');
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    console.log(`行 ${i}: Kode Pekerjaan = "${row['Kode Pekerjaan']}"`);
  }

  // 统计所有职业值的分布
  const jobValues = {};
  jsonData.forEach(row => {
    const job = row['Kode Pekerjaan'];
    jobValues[job] = (jobValues[job] || 0) + 1;
  });
  console.log('\n职业值分布:');
  Object.entries(jobValues).forEach(([value, count]) => {
    console.log(`  "${value}": ${count} 行`);
  });

  // 查看前10行的行业数据
  console.log('\n前10行的行业数据:');
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    console.log(`行 ${i}: Kode Bidang Usaha = "${row['Kode Bidang Usaha']}"`);
  }

  // 统计所有行业值的分布
  const sectorValues = {};
  jsonData.forEach(row => {
    const sector = row['Kode Bidang Usaha'];
    sectorValues[sector] = (sectorValues[sector] || 0) + 1;
  });
  console.log('\n行业值分布:');
  Object.entries(sectorValues).forEach(([value, count]) => {
    console.log(`  "${value}": ${count} 行`);
  });

  // 查看前10行的收入来源数据
  console.log('\n前10行的收入来源数据:');
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i];
    console.log(`行 ${i}: Kode Sumber Penghasilan = "${row['Kode Sumber Penghasilan']}"`);
  }

  // 统计所有收入来源值的分布
  const incomeValues = {};
  jsonData.forEach(row => {
    const income = row['Kode Sumber Penghasilan'];
    incomeValues[income] = (incomeValues[income] || 0) + 1;
  });
  console.log('\n收入来源值分布:');
  Object.entries(incomeValues).forEach(([value, count]) => {
    console.log(`  "${value}": ${count} 行`);
  });
}