"""Pruebas de archivos aisladas: también ejecutables con unittest, sin PostgreSQL."""

import tempfile
import unittest
from contextlib import redirect_stderr
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from app import archivos_legado


class ArchivosLegadoTests(unittest.TestCase):
    def setUp(self):
        self.temporal = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporal.cleanup)
        self.raiz = Path(self.temporal.name)
        self.directorio = self.raiz / "datos_legado"
        self.directorio.mkdir()
        parche = patch.object(archivos_legado, "DIRECTORIO_LEGADO", self.directorio)
        parche.start()
        self.addCleanup(parche.stop)
        self.exterior = self.raiz / "fuera.json"
        self.exterior.write_text('{"tablas": {}}', encoding="utf-8")

    def test_json_autorizado_con_bom(self):
        (self.directorio / "legado_20261025.json").write_text(
            '{"tablas": {}}', encoding="utf-8-sig"
        )
        self.assertEqual(
            archivos_legado.leer_json_legado("legado_20261025.json"), {"tablas": {}}
        )

    def test_rechaza_rutas_antes_de_leer(self):
        rutas = [
            "../fuera.json", "..\\fuera.json", str(self.exterior),
            "/etc/passwd", "C:\\datos\\fuera.json", "C:fuera.json",
            "\\\\servidor\\datos\\fuera.json", "sub/archivo.json",
            "sub\\archivo.json", "a..b.json", "archivo.txt", "", "archivo.json\x00",
            "%2e%2e%2ffuera.json",
        ]
        for nombre in rutas:
            with self.subTest(nombre=nombre), patch.object(Path, "read_text") as lectura:
                with self.assertRaises(ValueError):
                    archivos_legado.leer_json_legado(nombre)
                lectura.assert_not_called()

    def test_rechaza_enlace_a_archivo_exterior(self):
        (self.directorio / "enlace.json").symlink_to(self.exterior)
        with patch.object(Path, "read_text") as lectura:
            with self.assertRaises(ValueError):
                archivos_legado.leer_json_legado("enlace.json")
            lectura.assert_not_called()

    def test_rechaza_carpeta_enlazada(self):
        enlace = self.raiz / "enlace"
        enlace.symlink_to(self.directorio, target_is_directory=True)
        with patch.object(archivos_legado, "DIRECTORIO_LEGADO", enlace):
            with self.assertRaises(ValueError):
                archivos_legado.leer_json_legado("archivo.json")

    def test_rechaza_directorio_con_extension_json(self):
        (self.directorio / "carpeta.json").mkdir()
        with self.assertRaises(ValueError):
            archivos_legado.leer_json_legado("carpeta.json")

    def test_archivo_inexistente(self):
        with self.assertRaises(FileNotFoundError):
            archivos_legado.leer_json_legado("ausente.json")

    def test_json_invalido(self):
        (self.directorio / "invalido.json").write_text("{", encoding="utf-8")
        with self.assertRaises(ValueError):
            archivos_legado.leer_json_legado("invalido.json")

    def test_raiz_debe_ser_objeto(self):
        (self.directorio / "lista.json").write_text("[]", encoding="utf-8")
        with self.assertRaises(ValueError):
            archivos_legado.leer_json_legado("lista.json")

    def test_cli_rechaza_ruta_antes_de_abrir_base_de_datos(self):
        from app import seed

        with patch.object(seed, "crear_engine") as engine, redirect_stderr(StringIO()):
            with self.assertRaises(SystemExit) as salida:
                seed.main(["--desde-json", "../fuera.json"])
            self.assertEqual(salida.exception.code, 2)
            engine.assert_not_called()

    def test_importacion_valida_conserva_productos_y_existencias(self):
        from app import seed

        (self.directorio / "valido.json").write_text(
            '{"tablas": {"catalog_products": {"filas": '
            '[{"id": 7, "nombre": "Producto legado", "precio_centavos": 1200}]}, '
            '"inventory_stock": {"filas": [{"product_id": 7, "existencias": 4}]}}}',
            encoding="utf-8",
        )
        datos = archivos_legado.leer_json_legado("valido.json")
        with (
            patch.object(seed, "_asegurar_tiendas", return_value={"alegria": 1}),
            patch.object(seed, "asegurar_producto", return_value=9) as producto,
            patch.object(seed, "asegurar_existencia_inicial") as inventario,
        ):
            resultado = seed.cargar_legado(None, datos)
            self.assertEqual(resultado, {"legado_cargados": 1, "legado_omitidos": 0})
            self.assertEqual(producto.call_args.kwargs["nombre"], "Producto legado")
            self.assertEqual(producto.call_args.kwargs["precio_centavos"], 1200)
            inventario.assert_called_once_with(None, 9, 4)
