import { useState } from 'react';
import { Pestanas } from '../../../core/components/Pestanas';
import { MaestroCrud } from '../../mantenimiento/components/MaestroCrud';
import { CONFIG_USUARIOS } from '../config/usuarios';
import { RolesTab } from '../components/RolesTab';
import { AuditoriaTab } from '../components/AuditoriaTab';
import { ParametrosTab } from '../components/ParametrosTab';

type Vista = 'usuarios' | 'roles' | 'auditoria' | 'parametros';

export const AdministracionPage: React.FC = () => {
  const [vista, setVista] = useState<Vista>('usuarios');

  return (
    <div className="max-w-6xl space-y-6">
      <Pestanas<Vista>
        etiqueta="Administración"
        pestanas={[
          { id: 'usuarios', titulo: 'Usuarios' },
          { id: 'roles', titulo: 'Roles y permisos' },
          { id: 'auditoria', titulo: 'Auditoría' },
          { id: 'parametros', titulo: 'Parámetros' },
        ]}
        activa={vista}
        onCambiar={setVista}
      />
      {vista === 'usuarios' && <MaestroCrud config={CONFIG_USUARIOS} />}
      {vista === 'roles' && <RolesTab />}
      {vista === 'auditoria' && <AuditoriaTab />}
      {vista === 'parametros' && <ParametrosTab />}
    </div>
  );
};
