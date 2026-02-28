import os
import hashlib

# Ruta de la imagen original
IMAGEN_ORIGINAL = r"d:\berakahhshop\static\images\general\bolsa_de_regalo.jpg"

def hash_file(path, block_size=65536):
    """Genera un hash SHA256 del archivo para identificar duplicados."""
    sha = hashlib.sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(block_size):
            sha.update(chunk)
    return sha.hexdigest()

def obtener_metadatos(path):
    """Obtiene tamaño y fechas de modificación/creación."""
    stats = os.stat(path)
    return {
        "size": stats.st_size,  # tamaño en bytes
        "created": stats.st_ctime,  # fecha de creación
        "modified": stats.st_mtime  # fecha de última modificación
    }

def buscar_copias(base_folder, imagen_original):
    """Busca copias exactas de la imagen original en la carpeta y subcarpetas."""
    hash_original = hash_file(imagen_original)
    meta_original = obtener_metadatos(imagen_original)
    copias = []

    for root, _, files in os.walk(base_folder):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff')):
                path = os.path.join(root, file)
                try:
                    meta = obtener_metadatos(path)
                    # Comparación por hash, tamaño y metadatos
                    if (hash_file(path) == hash_original and
                        meta["size"] == meta_original["size"] and
                        path != imagen_original):
                        copias.append((path, meta))
                except Exception as e:
                    print(f"Error leyendo {path}: {e}")

    return copias

def informe_copias(copias, imagen_original, output_file="informe_copias.txt"):
    """Genera un informe con todas las rutas y metadatos de copias encontradas."""
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("--- INFORME DE COPIAS ---\n")
        f.write(f"Imagen original: {imagen_original}\n")
        if not copias:
            f.write("No se encontraron copias.\n")
            print("\nNo se encontraron copias.")
        else:
            f.write(f"\nSe encontraron {len(copias)} copias:\n")
            for p, meta in copias:
                f.write(f"  - {p}\n")
                f.write(f"    Tamaño: {meta['size']} bytes\n")
                f.write(f"    Creado: {meta['created']}\n")
                f.write(f"    Modificado: {meta['modified']}\n")
            print(f"\nSe encontraron {len(copias)} copias. Informe guardado en {output_file}")

def eliminar_copias(copias):
    """Elimina las copias encontradas (opcional, con confirmación)."""
    for p, _ in copias:
        try:
            os.remove(p)
            print(f"Eliminado: {p}")
        except Exception as e:
            print(f"Error eliminando {p}: {e}")

if __name__ == "__main__":
    carpeta = input("Ingresa la ruta de la carpeta a analizar: ").strip()
    copias = buscar_copias(carpeta, IMAGEN_ORIGINAL)
    informe_copias(copias, IMAGEN_ORIGINAL)

    if copias:
        opcion = input("\n¿Deseas eliminar las copias encontradas? (s/n): ").lower()
        if opcion == 's':
            confirmar = input("¿Seguro que quieres eliminar las copias? (s/n): ").lower()
            if confirmar == 's':
                eliminar_copias(copias)
                print("\nProceso completado.")
            else:
                print("\nNo se eliminó ningún archivo.")
        else:
            print("\nNo se eliminó ningún archivo.")