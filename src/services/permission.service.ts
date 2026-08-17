import { permissionRepository } from '../repositories/permission.repository';

export const permissionService = {
  findAll() {
    return permissionRepository.findAll();
  },
  ensureSeeded() {
    return permissionRepository.ensureSeeded();
  },
};
