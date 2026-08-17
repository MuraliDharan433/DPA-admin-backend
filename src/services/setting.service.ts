import { SettingModel } from '../models/Setting.model';

const GLOBAL_KEY = 'global';

export interface SettingInput {
  instituteName?: string;
  instituteEmail?: string;
  institutePhone?: string;
  instituteAddress?: string;
}

export const settingService = {
  async get() {
    let setting = await SettingModel.findOne({ key: GLOBAL_KEY });
    if (!setting) setting = await SettingModel.create({ key: GLOBAL_KEY });
    return setting;
  },

  async update(dto: SettingInput, updatedBy: string) {
    const setting = await this.get();
    Object.assign(setting, dto, { updatedBy });
    await setting.save();
    return setting;
  },
};
