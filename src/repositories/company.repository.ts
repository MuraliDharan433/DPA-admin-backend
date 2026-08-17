import { CompanyModel, ICompany } from '../models/Company.model';
import { paginate, buildSearchFilter, type ListQuery } from '../utils/pagination';

export const companyRepository = {
  findAll(query: ListQuery) {
    const filter = buildSearchFilter(query.search, ['name', 'industry', 'location']);
    return paginate<ICompany>(CompanyModel, filter, query);
  },
  findAllLite() {
    return CompanyModel.find().select('name').sort({ name: 1 });
  },
  findById(id: string) {
    return CompanyModel.findById(id);
  },
  create(data: Partial<ICompany>) {
    return CompanyModel.create(data);
  },
  deleteById(id: string) {
    return CompanyModel.deleteOne({ _id: id });
  },
};
