begin;

drop function if exists public.calcular_modelo_130(uuid, integer, integer);
drop function if exists public.calcular_modelo_303(uuid, integer, integer);

drop table if exists public.declaraciones_presentadas;
drop table if exists public.ingresos;
drop table if exists public.gastos;
drop table if exists public.empresas;

commit;
