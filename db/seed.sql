-- ============================================================
-- DAEM Prueba Tecnica — Datos dummy
-- Se carga automaticamente al iniciar el contenedor de PostgreSQL
-- ============================================================

-- Empresas clientes de la asesoria
CREATE TABLE IF NOT EXISTS empresas (
  id          VARCHAR(10) PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  nif         VARCHAR(20) NOT NULL,
  programa    VARCHAR(10) NOT NULL CHECK (programa IN ('A3ECO', 'A3NOM', 'A3GES')),
  activa      BOOLEAN NOT NULL DEFAULT true,
  ultima_sync TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apuntes contables (simulan movimientos de caja)
CREATE TABLE IF NOT EXISTS apuntes (
  id          SERIAL PRIMARY KEY,
  empresa_id  VARCHAR(10) NOT NULL REFERENCES empresas(id),
  fecha       DATE NOT NULL,
  ejercicio   INTEGER NOT NULL,
  mes         INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO', 'GASTO')),
  concepto    VARCHAR(200) NOT NULL,
  importe     NUMERIC(12,2) NOT NULL CHECK (importe > 0)
);

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  rol           VARCHAR(20) NOT NULL DEFAULT 'viewer'
);

-- ============================================================
-- Datos de empresas
-- ============================================================
INSERT INTO empresas (id, nombre, nif, programa, ultima_sync) VALUES
  ('E001', 'Acuarios del Mediterraneo SL',   'B12345678', 'A3ECO', NOW() - INTERVAL '2 minutes'),
  ('E002', 'Transportes Garriga SA',          'A87654321', 'A3ECO', NOW() - INTERVAL '10 minutes'),
  ('E003', 'Consultoria Vertex SLP',          'B55512300', 'A3NOM', NOW() - INTERVAL '45 minutes'),
  ('E004', 'Panaderia Can Jordi SL',          'B99887766', 'A3GES', NOW() - INTERVAL '3 minutes'),
  ('E005', 'Importaciones Levante SA',        'A11223344', 'A3ECO', NOW() - INTERVAL '1 hour'),
  ('E006', 'Clinica Dental Roca SC',          'J44556677', 'A3NOM', NOW() - INTERVAL '4 minutes');

-- ============================================================
-- Apuntes contables 2024
-- ============================================================
INSERT INTO apuntes (empresa_id, fecha, ejercicio, mes, tipo, concepto, importe) VALUES
  -- E001 - Acuarios del Mediterraneo
  ('E001', '2024-01-15', 2024, 1, 'INGRESO', 'Venta acuarios premium', 12500.00),
  ('E001', '2024-01-20', 2024, 1, 'GASTO',   'Compra material acuatico', 3200.00),
  ('E001', '2024-02-10', 2024, 2, 'INGRESO', 'Mantenimiento acuarios', 4800.00),
  ('E001', '2024-02-28', 2024, 2, 'GASTO',   'Nominas febrero', 5100.00),
  ('E001', '2024-03-05', 2024, 3, 'INGRESO', 'Instalacion acuario corporativo', 18000.00),
  ('E001', '2024-03-15', 2024, 3, 'GASTO',   'Alquiler local', 1800.00),

  -- E002 - Transportes Garriga
  ('E002', '2024-01-08', 2024, 1, 'INGRESO', 'Transporte mercancias enero',  22000.00),
  ('E002', '2024-01-25', 2024, 1, 'GASTO',   'Combustible flota enero',       8500.00),
  ('E002', '2024-02-12', 2024, 2, 'INGRESO', 'Transporte mercancias febrero', 19500.00),
  ('E002', '2024-02-20', 2024, 2, 'GASTO',   'Mantenimiento vehiculos',       3200.00),
  ('E002', '2024-03-10', 2024, 3, 'INGRESO', 'Contrato logistica trimestral', 35000.00),
  ('E002', '2024-03-25', 2024, 3, 'GASTO',   'Seguros flota',                  4100.00),

  -- E003 - Consultoria Vertex
  ('E003', '2024-01-31', 2024, 1, 'INGRESO', 'Honorarios consultoria enero',  9000.00),
  ('E003', '2024-01-31', 2024, 1, 'GASTO',   'Nominas enero',                  6500.00),
  ('E003', '2024-02-28', 2024, 2, 'INGRESO', 'Honorarios consultoria febrero', 8500.00),
  ('E003', '2024-02-28', 2024, 2, 'GASTO',   'Gastos oficina',                   800.00),
  ('E003', '2024-03-31', 2024, 3, 'INGRESO', 'Proyecto auditoria interna',    15000.00),
  ('E003', '2024-03-31', 2024, 3, 'GASTO',   'Nominas marzo',                  6500.00),

  -- E004 - Panaderia Can Jordi
  ('E004', '2024-01-31', 2024, 1, 'INGRESO', 'Ventas panaderia enero',  8200.00),
  ('E004', '2024-01-31', 2024, 1, 'GASTO',   'Materias primas enero',   3100.00),
  ('E004', '2024-02-29', 2024, 2, 'INGRESO', 'Ventas panaderia febrero', 7900.00),
  ('E004', '2024-02-29', 2024, 2, 'GASTO',   'Nominas febrero',          4200.00),
  ('E004', '2024-03-31', 2024, 3, 'INGRESO', 'Ventas panaderia marzo',   8600.00),
  ('E004', '2024-03-31', 2024, 3, 'GASTO',   'Electricidad y gas',       1100.00),

  -- E005 - Importaciones Levante
  ('E005', '2024-01-20', 2024, 1, 'INGRESO', 'Importacion electronica',  45000.00),
  ('E005', '2024-01-20', 2024, 1, 'GASTO',   'Aranceles y transporte',   12000.00),
  ('E005', '2024-02-15', 2024, 2, 'INGRESO', 'Importacion textil',       28000.00),
  ('E005', '2024-02-15', 2024, 2, 'GASTO',   'Almacenamiento',            3500.00),
  ('E005', '2024-03-22', 2024, 3, 'INGRESO', 'Importacion componentes',  38000.00),
  ('E005', '2024-03-22', 2024, 3, 'GASTO',   'Seguros mercancia',         2800.00),

  -- E006 - Clinica Dental Roca
  ('E006', '2024-01-31', 2024, 1, 'INGRESO', 'Ingresos clinica enero',   14500.00),
  ('E006', '2024-01-31', 2024, 1, 'GASTO',   'Material sanitario',        2200.00),
  ('E006', '2024-02-29', 2024, 2, 'INGRESO', 'Ingresos clinica febrero',  13800.00),
  ('E006', '2024-02-29', 2024, 2, 'GASTO',   'Nominas febrero',            8500.00),
  ('E006', '2024-03-31', 2024, 3, 'INGRESO', 'Ingresos clinica marzo',    15200.00),
  ('E006', '2024-03-31', 2024, 3, 'GASTO',   'Alquiler local clinica',     3200.00);

-- ============================================================
-- Usuarios (password = "test1234" hasheado con bcrypt)
-- ============================================================
INSERT INTO usuarios (email, password_hash, rol) VALUES
  ('admin@daem.es',   '$2b$10$kHRkfUAj9he2lvDGb9BmT.tw/fEnD.8/pqiuE0xZ85ZwPueldp3Ru', 'admin'),
  ('sergi@daem.es',   '$2b$10$ErsWfmw7qzUZw9ix8gQ3E.xMSSSnMXYb9XukV6meTxXlxb2Cp0Fj6', 'viewer'),
  ('maria@daem.es',   '$2b$10$jas3.35jOoTQMAw8XG5jkeGW4aNOxZrgiuH7Fz0WIVtpPlpzirClq', 'viewer');
