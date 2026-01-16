import pandas as pd
import os

file_path = "Venstas Pagos.xlsm"
output_report = "INFORME_ESTRUCTURA_POS.txt"

def analyze():
    if not os.path.exists(file_path):
        print(f"Error: No se encuentra el archivo {file_path}")
        return

    report = []
    report.append("=== INFORME DE ESTRUCTURA DE NEGOCIO (ANONIMIZADO) ===\n")

    try:
        xl = pd.ExcelFile(file_path)
        report.append(f"Hojas encontradas: {', '.join(xl.sheet_names)}\n")

        for sheet in xl.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet, nrows=5) # Solo leemos 5 filas para entender
            report.append(f"--- Hoja: {sheet} ---")
            column_names = [str(col) for col in df.columns.tolist()]
            report.append(f"Columnas detectadas: {', '.join(column_names)}")
            
            # Identificamos si hay columnas de dinero o stock para darte sugerencias
            cols_lowercase = [c.lower() for c in df.columns]
            if any(x in cols_lowercase for x in ['precio', 'price', 'monto', 'total', 'costo']):
                report.append(">> Esta hoja parece contener DATOS FINANCIEROS.")
            if any(x in cols_lowercase for x in ['stock', 'cantidad', 'inventario', 'unidades']):
                report.append(">> Esta hoja parece ser de INVENTARIO.")
            
            report.append("\n")

        with open(output_report, "w") as f:
            f.write("\n".join(report))
        
        print(f"Hecho. Se ha generado el archivo: {output_report}")
        print("Abre ese archivo, borra lo que sea privado, y pégame el resto aquí.")

    except Exception as e:
        print(f"Error al procesar: {e}")

if __name__ == "__main__":
    analyze()
