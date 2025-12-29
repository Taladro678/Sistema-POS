
import * as XLSX from 'xlsx';


const FILE_PATH = 'C:/Users/PC OFICINA/Desktop/LIBROS/Listado de Productos.xls';

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON with array of arrays to see exact layout
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Log first 10 rows to understand structure
    console.log("--- First 10 Rows ---");
    console.log(JSON.stringify(data.slice(0, 10), null, 2));

    // Log rows that look like products (have name in col A, price in col O?)
    console.log("\n--- Sample Product Rows ---");
    const productRows = data.filter((row) => {
        // Based on image: Name is in col 0 (A)
        // Cost might be in K (10) or L (11)
        // Price might be in O (14) or P (15)
        // Row usually starts with text in col 0 and has numbers later
        return row[0] && typeof row[0] === 'string' && row.length > 5;
    }).slice(0, 5);
    console.log(JSON.stringify(productRows, null, 2));

} catch (e) {
    console.error("Error reading file:", e);
}
