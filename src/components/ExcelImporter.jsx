import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Loader } from 'lucide-react';

/**
 * Componente reutilizable para importar Excel
 * @param {Function} onDataLoaded - Callback que recibe los datos parseados (array de objetos)
 * @param {String} buttonText - Texto del botón
 * @param {String} templateName - Nombre para mostrar en mensajes
 */
const ExcelImporter = (props) => {
    const { onDataLoaded, buttonText = "Importar Excel", templateName = "datos" } = props;
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleButtonClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);

        try {
            const data = await parseExcel(file);
            onDataLoaded(data);

            // Clean input to allow re-uploading same file fix
            e.target.value = '';
        } catch (error) {
            console.error("Error importando excel:", error);
            alert(`Error al leer el archivo excel: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const parseExcel = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });

                    // Tomamos la primera hoja
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];

                    // Convertimos a JSON
                    const options = props.sheetToJsonOptions || {};
                    const jsonData = XLSX.utils.sheet_to_json(sheet, options);
                    resolve(jsonData);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = (err) => reject(err);
            reader.readAsBinaryString(file);
        });
    };

    return (
        <>
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                ref={fileInputRef}
                style={{ display: 'none' }}
            />
            <button
                onClick={handleButtonClick}
                className="glass-button accent flex items-center gap-2"
                disabled={isLoading}
            >
                {isLoading ? <Loader size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                {isLoading ? "Leyendo..." : buttonText}
            </button>
        </>
    );
};

export default ExcelImporter;
