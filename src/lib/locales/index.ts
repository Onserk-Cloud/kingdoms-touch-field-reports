import type { Locale, NsDict } from './types';
import common from './common';
import splash from './splash';
import login from './login';
import home from './home';
import newReport from './newReport';
import camera from './camera';
import review from './review';
import success from './success';
import myReports from './myReports';
import supervisor from './supervisor';
import supervisorDetail from './supervisorDetail';
import profile from './profile';
import tabBar from './tabBar';
import badge from './badge';
import pdf from './pdf';
import editReport from './editReport';

/** All namespace dictionaries. Keys are exposed as `namespace.key`. */
const NS: Record<string, NsDict> = {
  common,
  splash,
  login,
  home,
  newReport,
  camera,
  review,
  success,
  myReports,
  supervisor,
  supervisorDetail,
  profile,
  tabBar,
  badge,
  pdf,
  editReport,
};

function build(loc: Locale): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [ns, dict] of Object.entries(NS)) {
    const table = dict[loc];
    for (const k of Object.keys(table)) {
      out[`${ns}.${k}`] = table[k];
    }
  }
  return out;
}

export type { Locale };

export const translations: Record<Locale, Record<string, string>> = {
  en: build('en'),
  es: build('es'),
};
