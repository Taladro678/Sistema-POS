const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'Listado de Productos.xls');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 'A', range: 0, defval: '' });

// Print Row 10 (Index 9)
console.log('--- ROW 10 FULL DUMP ---');
const row10 = jsonData[9];
Object.keys(row10).forEach(key => {
    if (row10[key]) console.log(`${key}: ${row10[key]}`);
});
