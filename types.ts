export interface SchemaField {
  name: string;
  label_cn?: string;
  source?: string;
  default?: string;
  transform?: string;
  fixedLength?: number;
  padType?: 'left' | 'right';
  padChar?: string;
  validate?: {
    required?: boolean;
    maxLength?: number;
    length?: number;
    type?: 'numeric' | 'string';
    regex?: RegExp;
    msg?: string;
  };
}

export interface DataRow {
  [key: string]: any;
  __sheetName?: string;
}

export enum Step {
  UPLOAD = 1,
  CONFIGURE = 2,
  EXPORT = 3
}
