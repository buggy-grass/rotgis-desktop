-- spatial_ref_sys tablosu (EPSG referansları için)
-- spatial_ref_sys.sql INSERT'leri bu tabloya yazılır
CREATE TABLE IF NOT EXISTS spatial_ref_sys (
  srid INTEGER PRIMARY KEY,
  auth_name TEXT,
  auth_srid INTEGER,
  srtext TEXT,
  proj4text TEXT
);
