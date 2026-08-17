import { companyRepository } from '../repositories/company.repository';
import { ApiError } from '../utils/apiResponse';
import type { ListQuery } from '../utils/pagination';

export interface CompanyInput {
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export const companyService = {
  findAll(query: ListQuery) {
    return companyRepository.findAll(query);
  },
  findAllLite() {
    return companyRepository.findAllLite();
  },
  async findById(id: string) {
    const company = await companyRepository.findById(id);
    if (!company) throw ApiError.notFound('Company not found');
    return company;
  },
  create(dto: CompanyInput) {
    return companyRepository.create(dto);
  },
  async update(id: string, dto: Partial<CompanyInput>) {
    const company = await this.findById(id);
    Object.assign(company, dto);
    await company.save();
    return company;
  },
  async delete(id: string) {
    await this.findById(id);
    await companyRepository.deleteById(id);
  },
};
