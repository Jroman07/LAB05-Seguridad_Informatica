-- Ejecutar RESET ROLE por separado y luego cada SELECT por separado.
-- Solo consulta metadatos de roles; no devuelve secretos.
reset role;

select
  current_user as rol_actual,
  session_user as rol_sesion,
  pg_has_role(current_user, 'una_chat_backend', 'MEMBER') as es_miembro,
  pg_has_role(current_user, 'una_chat_backend', 'SET') as puede_asumir_rol,
  pg_has_role(current_user, 'una_chat_backend', 'USAGE') as hereda_privilegios;

select
  m.roleid::regrole as rol,
  m.member::regrole as miembro,
  m.grantor::regrole as otorgado_por,
  m.admin_option,
  m.inherit_option,
  m.set_option
from pg_auth_members as m
where m.roleid = 'una_chat_backend'::regrole;

-- Supabase puede conservar una membresía administrativa otorgada por
-- supabase_admin: MEMBER=true, SET=false, USAGE=false. Esa membresía no
-- demuestra que permanezca el permiso temporal de lectura de la prueba.
-- Documentar los valores reales. No intentar eliminar roles de Supabase.
-- Referencia:
-- https://supabase.com/kb/troubleshooting/cant-revoke-a-role-membership-granted-by-supabase_admin-d08922
