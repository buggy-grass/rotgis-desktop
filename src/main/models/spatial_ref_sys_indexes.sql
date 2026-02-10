-- spatial_ref_sys sorgu hızı için indeksler (veri yüklendikten sonra çalışır)
-- Örnek arama: WHERE auth_name='EPSG' AND auth_srid=4326
CREATE INDEX IF NOT EXISTS idx_spatial_ref_sys_auth ON spatial_ref_sys (auth_name, auth_srid);
CREATE INDEX IF NOT EXISTS idx_spatial_ref_sys_auth_name ON spatial_ref_sys (auth_name);

ANALYZE spatial_ref_sys;
