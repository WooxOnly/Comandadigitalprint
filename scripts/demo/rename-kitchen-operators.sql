-- Authorized presentation data only. Preserve original records and synchronize changes.
CREATE TABLE IF NOT EXISTS demo_operator_name_backup(store_id TEXT,key TEXT,data TEXT,revision INTEGER,PRIMARY KEY(store_id,key));
INSERT OR IGNORE INTO demo_operator_name_backup
SELECT store_id,key,data,revision FROM store_records
WHERE store_id='seabra-1' AND key GLOB 'preparation:*'
AND (json_extract(data,'$.startedBy') GLOB 'demo.cozinha.[1-4]' OR json_extract(data,'$.readyBy') GLOB 'demo.cozinha.[1-4]');
WITH names(legacy,name) AS (VALUES ('demo.cozinha.1','demo.cozinha.kainan'),('demo.cozinha.2','demo.cozinha.davi'),('demo.cozinha.3','demo.cozinha.carla'),('demo.cozinha.4','demo.cozinha.elizabeth')),
first AS (SELECT b.*,CASE WHEN EXISTS(SELECT 1 FROM names WHERE legacy=json_extract(b.data,'$.startedBy')) THEN json_set(b.data,'$.startedBy',(SELECT name FROM names WHERE legacy=json_extract(b.data,'$.startedBy'))) ELSE b.data END renamed FROM demo_operator_name_backup b JOIN store_records r ON r.store_id=b.store_id AND r.key=b.key AND r.revision=b.revision AND r.data=b.data WHERE b.store_id='seabra-1'),
second AS (SELECT *,CASE WHEN EXISTS(SELECT 1 FROM names WHERE legacy=json_extract(renamed,'$.readyBy')) THEN json_set(renamed,'$.readyBy',(SELECT name FROM names WHERE legacy=json_extract(renamed,'$.readyBy'))) ELSE renamed END final FROM first)
INSERT INTO store_events(store_id,mutation,key,data,actor,created_at)
SELECT store_id,'presentation-names-v1:'||key,key,final,'demo.names',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM second WHERE final<>data
ON CONFLICT(store_id,mutation) DO NOTHING;
