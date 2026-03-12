import { SchemaField } from './types';

/**
 * D01: Debitur Perseorangan (39 Fields)
 */
export const D01_SCHEMA: SchemaField[] = [
    { name: "FLAG DETAIL", label_cn: "明细标志", default: "D", source: "Flag Detail", fixedLength: 1 },
    { name: "NOMOR CIF DEBITUR", label_cn: "客户号 (CIF)", source: "Nomor CIF Debitur", transform: "clean_numeric", fixedLength: 25, padType: 'right', padChar: ' ' },
    { name: "JENIS IDENTITAS", label_cn: "证件类型", default: "1", source: "Jenis Identitas", fixedLength: 1 },
    { name: "NOMOR IDENTITAS", label_cn: "证件号码", source: "Nomor Identitas", transform: "nik_16", fixedLength: 16 },
    { name: "NAMA SESUAI IDENTITAS", label_cn: "证件姓名", source: "Nama Sesuai Identitas", transform: "clean_name", fixedLength: 50, padType: 'right', padChar: ' ' },
    { name: "NAMA LENGKAP", label_cn: "全名", source: "Nama Lengkap", transform: "clean_name", fixedLength: 50, padType: 'right', padChar: ' ' },
    { name: "KODE STATUS PENDIDIKAN", label_cn: "教育程度代码", source: "Kode Status Pendidikan", transform: "education_code", fixedLength: 2 },
    { name: "JENIS KELAMIN", label_cn: "性别", source: "Jenis Kelamin", transform: "gender_code", fixedLength: 1 },
    { name: "TEMPAT LAHIR", label_cn: "出生地", source: "Tempat Lahir", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "TANGGAL LAHIR", label_cn: "出生日期", source: "Tanggal Lahir", fixedLength: 8 },
    { name: "NOMOR NPWP", label_cn: "税号 (NPWP)", source: "NPWP", fixedLength: 15 },
    { name: "ALAMAT", label_cn: "地址", source: "Alamat", transform: "clean_address", fixedLength: 100, padType: 'right', padChar: ' ' },
    { name: "KELURAHAN", label_cn: "村/社区", source: "Kelurahan", fixedLength: 35, padType: 'right', padChar: ' ' },
    { name: "KECAMATAN", label_cn: "镇/区", source: "Kecamatan", fixedLength: 35, padType: 'right', padChar: ' ' },
    { name: "KODE KABUPATEN/KOTA", label_cn: "市/县代码", source: "Kode Kabupaten atau Kota", transform: "city_code", fixedLength: 4 },
    { name: "KODE POS", label_cn: "邮政编码", source: "Kode Pos", transform: "zip_code", fixedLength: 5 },
    { name: "NOMOR TELEPON", label_cn: "电话号码", source: "Nomor Telepon", transform: "phone", fixedLength: 15, padType: 'right', padChar: ' ' },
    { name: "NOMOR HP", label_cn: "手机号码", source: "Nomor Telepon Seluler", transform: "phone", fixedLength: 15, padType: 'right', padChar: ' ' },
    { name: "ALAMAT EMAIL", label_cn: "电子邮箱", source: "Alamat Surat Elektronik", fixedLength: 100, padType: 'right', padChar: ' ' },
    { name: "KODE NEGARA DOMISILI", label_cn: "居住国代码", default: "ID", source: "Kode Negara Domisili", fixedLength: 2 },
    { name: "KODE PEKERJAAN", label_cn: "职业代码", source: "Kode Pekerjaan", transform: "occupation_code", fixedLength: 3 },
    { name: "TEMPAT BEKERJA", label_cn: "工作单位", source: "Tempat Bekerja", default: "NA", fixedLength: 50, padType: 'right', padChar: ' ' },
    { name: "BIDANG USAHA TEMPAT BEKERJA", label_cn: "单位业务领域", source: "Kode Pekerjaan", transform: "sector_code", fixedLength: 6 },
    { name: "ALAMAT TEMPAT BEKERJA", label_cn: "单位地址", source: "Alamat Tempat Bekerja", transform: "clean_address", fixedLength: 100, padType: 'right', padChar: ' ' },
    { name: "PENGHASILAN KOTOR PER TAHUN", label_cn: "年总收入", source: "Penghasilan Kotor", fixedLength: 15 },
    { name: "KODE SUMBER PENGHASILAN", label_cn: "收入来源代码", source: "Kode Sumber Penghasilan", transform: "income_source", fixedLength: 2 },
    { name: "JUMLAH TANGGUNGAN", label_cn: "抚养人数", source: "Jumlah Tanggungan", default: "0", fixedLength: 2 },
    { name: "KODE HUBUNGAN DENGAN PELAPOR", label_cn: "与申报机构关系代码", source: "Kode Hubungan", default: "20", fixedLength: 2 },
    { name: "KODE GOLONGAN DEBITUR", label_cn: "债务人分类代码", source: "Kode Golongan", default: "9", fixedLength: 1 },
    { name: "STATUS PERKAWINAN", label_cn: "婚姻状况", source: "Status Perkawinan", transform: "marital_code", fixedLength: 1 },
    { name: "NOMOR IDENTITAS PASANGAN", label_cn: "配偶证件号码", source: "Nomor Identitas Pasangan", default: "", fixedLength: 16 },
    { name: "NAMA PASANGAN", label_cn: "配偶姓名", source: "Nama Pasangan", default: "", transform: "clean_name", fixedLength: 50, padType: 'right', padChar: ' ' },
    { name: "TANGGAL LAHIR PASANGAN", label_cn: "配偶出生日期", source: "Tanggal Lahir Pasangan", default: "", fixedLength: 8 },
    { name: "PERJANJIAN PISAH HARTA", label_cn: "财产分割协议", source: "Perjanjian Pisah Harta", fixedLength: 1 },
    { name: "MELANGGAR BMPK", label_cn: "违反 BMPK", source: "Melanggar BMPK", default: "2", fixedLength: 1 },
    { name: "MELAMPAUI BMPK", label_cn: "超过 BMPK", source: "Melampaui BMPK", default: "2", fixedLength: 1 },
    { name: "NAMA GADIS IBU KANDUNG", label_cn: "母亲婚前姓名", source: "Nama Gadis Ibu Kandung", transform: "clean_name", fixedLength: 50, padType: 'right', padChar: ' ' },
    { name: "KODE KANTOR CABANG", label_cn: "分行代码", source: "Kode Kantor Cabang", default: "001", fixedLength: 3 },
    { name: "OPERASI DATA", label_cn: "数据操作", source: "Operasi Data", default: "C", fixedLength: 1 }
];

/**
 * F01: Fasilitas Kredit (48 Fields)
 */
export const F01_SCHEMA: SchemaField[] = [
    { name: "FLAG DETAIL", label_cn: "明细标志", default: "D", source: "Flag Detail", fixedLength: 1 },
    { name: "NOMOR REKENING FASILITAS", label_cn: "账号/合同号", source: "Nomor Rekening Fasilitas", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "NOMOR CIF DEBITUR", label_cn: "客户号 (CIF)", source: "Nomor CIF Debitur", transform: "clean_numeric", fixedLength: 25, padType: 'right', padChar: ' ' },
    { name: "KODE SIFAT KREDIT", label_cn: "授信性质代码", source: "Kode Sifat Kredit", default: "1", fixedLength: 1 },
    { name: "KODE JENIS KREDIT", label_cn: "授信类型代码", source: "Kode Jenis Kredit", default: "20", fixedLength: 2 },
    { name: "KODE AKAD KREDIT", label_cn: "合同类型代码", source: "Kode Akad Kredit", default: "01", fixedLength: 2 },
    { name: "NOMOR AKAD AWAL", label_cn: "初始合同号", source: "Nomor Akad Awal", default: "", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "TANGGAL AKAD AWAL", label_cn: "初始合同日期", source: "Tanggal Akad Awal", default: "", fixedLength: 8 },
    { name: "NOMOR AKAD AKHIR", label_cn: "最终合同号", source: "Nomor Akad Akhir", default: "", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "TANGGAL AKAD AKHIR", label_cn: "最终合同日期", source: "Tanggal Akad Akhir", default: "", fixedLength: 8 },
    { name: "FREKUENSI PERPANJANGAN", label_cn: "展期次数", source: "Frekuensi Perpanjangan", default: "0", fixedLength: 4 },
    { name: "TANGGAL AWAL KREDIT", label_cn: "授信开始日期", source: "Tanggal Awal Kredit", transform: "date", fixedLength: 8 },
    { name: "TANGGAL MULAI", label_cn: "开始日期", source: "Tanggal Mulai", transform: "date", fixedLength: 8 },
    { name: "TANGGAL JATUH TEMPO", label_cn: "到期日期", source: "Tanggal Jatuh Tempo", transform: "date", fixedLength: 8 },
    { name: "KODE KATEGORI DEBITUR", label_cn: "债务人类别代码", source: "Kode Kategori Debitur", default: "10", fixedLength: 2 },
    { name: "KODE JENIS PENGGUNAAN", label_cn: "使用类型代码", source: "Kode Jenis Penggunaan", default: "3", fixedLength: 1 },
    { name: "KODE ORIENTASI PENGGUNAAN", label_cn: "使用导向代码", source: "Kode Orientasi Penggunaan", default: "1", fixedLength: 1 },
    { name: "KODE SEKTOR EKONOMI", label_cn: "经济部门代码", source: "Kode Sektor Ekonomi", transform: "sector_code", fixedLength: 6 },
    { name: "KODE KABUPATEN/KOTA LOKASI", label_cn: "项目所在地代码", source: "Kode Kabupaten/Kota Lokasi", transform: "city_code", fixedLength: 4 },
    { name: "NILAI PROYEK", label_cn: "项目价值", source: "Nilai Proyek", default: "", fixedLength: 15 },
    { name: "KODE VALUTA", label_cn: "币种代码", source: "Kode Valuta", default: "IDR", fixedLength: 3 },
    { name: "SUKU BUNGA ATAU IMBALAN", label_cn: "利率", source: "Suku Bunga atau Imbalan", default: "", transform: "format_interest", fixedLength: 5 },
    { name: "JENIS SUKU BUNGA", label_cn: "利率类型", source: "Jenis Suku Bunga", default: "1", fixedLength: 1 },
    { name: "KREDIT PROGRAM PEMERINTAH", label_cn: "政府项目信贷", source: "Kredit Program Pemerintah", default: "00", fixedLength: 2 },
    { name: "ASAL KREDIT TAKEOVER", label_cn: "接管自", source: "Asal Kredit Takeover", default: "", fixedLength: 6 },
    { name: "SUMBER DANA", label_cn: "资金来源代码", source: "Sumber Dana", default: "1", fixedLength: 1 },
    { name: "PLAFON AWAL", label_cn: "初始额度", source: "Plafon Awal", transform: "clean_numeric", fixedLength: 15 },
    { name: "PLAFON", label_cn: "当前额度", source: "Plafon", transform: "raw_zero", fixedLength: 15 },
    { name: "REALISASI BULAN BERJALAN", label_cn: "放款金额", source: "Realisasi Bulan Berjalan", fixedLength: 15 },
    { name: "DENDA", label_cn: "罚金", source: "Denda", transform: "amount", fixedLength: 15 },
    { name: "BAKI DEBET", label_cn: "未还本金", source: "Baki Debet", default: "0", transform: "clean_numeric", fixedLength: 15 },
    { name: "NILAI DALAM MATA UANG ASAL", label_cn: "原币种价值", source: "Nilai Dalam Mata Uang Asal", default: "", fixedLength: 15 },
    { name: "KODE KUALITAS KREDIT", label_cn: "五级分类代码", source: "Kode Kualitas Kredit", fixedLength: 1 },
    { name: "TANGGAL MACET", label_cn: "逾期/违约日期", source: "Tanggal Macet", default: "", fixedLength: 8 },
    { name: "KODE SEBAB MACET", label_cn: "违约原因代码", source: "Kode Sebab Macet", default: "", fixedLength: 2 },
    { name: "TUNGGAKAN POKOK", label_cn: "逾期本金", source: "Tunggakan Pokok", transform: "amount", fixedLength: 15 },
    { name: "TUNGGAKAN BUNGA", label_cn: "逾期利息", source: "Tunggakan Bunga", transform: "amount", fixedLength: 15 },
    { name: "JUMLAH HARI TUNGGAKAN", label_cn: "逾期天数", source: "Jumlah Hari Tunggakan", default: "0", transform: "clean_numeric", fixedLength: 4 },
    { name: "FREKUENSI TUNGGAKAN", label_cn: "逾期次数", source: "Frekuensi Tunggakan", default: "0", fixedLength: 4 },
    { name: "FREKUENSI RESTRUKTURISASI", label_cn: "重组次数", source: "Frekuensi Restrukturisasi", default: "0", fixedLength: 4 },
    { name: "TANGGAL RESTRUKTURISASI AWAL", label_cn: "初始重组日期", source: "Tanggal Restrukturisasi Awal", default: "", fixedLength: 8 },
    { name: "TANGGAL RESTRUKTURISASI AKHIR", label_cn: "最终重组日期", source: "Tanggal Restrukturisasi Akhir", default: "", fixedLength: 8 },
    { name: "KODE CARA RESTRUKTURISASI", label_cn: "重组方式代码", source: "Kode Cara Restrukturisasi", default: "", fixedLength: 2 },
    { name: "KODE KONDISI", label_cn: "状况代码", source: "Kode Kondisi", default: "00", fixedLength: 2 },
    { name: "TANGGAL KONDISI", label_cn: "状况日期", source: "Tanggal Kondisi", default: "", fixedLength: 8 },
    { name: "KETERANGAN", label_cn: "备注", source: "Keterangan", default: "", fixedLength: 100, padType: 'right', padChar: ' ' },
    { name: "KODE KANTOR CABANG", label_cn: "分行代码", source: "Kode Kantor Cabang", default: "001", fixedLength: 3 },
    { name: "OPERASI DATA", label_cn: "数据操作", source: "Operasi Data", default: "C", fixedLength: 1 }
];

/**
 * P01: Penjamin (12 Fields)
 */
export const P01_SCHEMA: SchemaField[] = [
    { name: "FLAG DETAIL", label_cn: "明细标志", default: "D", source: "Flag Detail", fixedLength: 1 },
    { name: "NOMOR REKENING FASILITAS", label_cn: "账号/合同号", source: "Nomor Rekening Fasilitas", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "NOMOR CIF PENJAMIN", label_cn: "担保人 CIF", source: "Nomor CIF Penjamin", transform: "clean_numeric", fixedLength: 25, padType: 'right', padChar: ' ' },
    { name: "JENIS IDENTITAS PENJAMIN", label_cn: "担保人证件类型", default: "1", source: "Jenis Identitas Penjamin", fixedLength: 1 },
    { name: "NOMOR IDENTITAS PENJAMIN", label_cn: "担保人证件号码", source: "Nomor Identitas Penjamin", transform: "nik_16", fixedLength: 16 },
    { name: "NAMA PENJAMIN", label_cn: "担保人姓名", source: "Nama Penjamin", transform: "clean_name", fixedLength: 50, padType: 'right', padChar: ' ' },
    { name: "ALAMAT PENJAMIN", label_cn: "担保人地址", source: "Alamat Penjamin", transform: "clean_address", fixedLength: 100, padType: 'right', padChar: ' ' },
    { name: "PROSENTASE DIJAMIN", label_cn: "担保比例", source: "Prosentase Dijamin", default: "100", fixedLength: 3 },
    { name: "KODE KANTOR CABANG", label_cn: "分行代码", source: "Kode Kantor Cabang", default: "001", fixedLength: 3 },
    { name: "OPERASI DATA", label_cn: "数据操作", source: "Operasi Data", default: "C", fixedLength: 1 }
];

/**
 * A01: Agunan (17 Fields)
 */
export const A01_SCHEMA: SchemaField[] = [
    { name: "FLAG DETAIL", label_cn: "明细标志", default: "D", source: "Flag Detail", fixedLength: 1 },
    { name: "NOMOR REKENING FASILITAS", label_cn: "账号/合同号", source: "Nomor Rekening Fasilitas", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "NOMOR AGUNAN", label_cn: "抵押物编号", source: "Nomor Agunan", fixedLength: 20, padType: 'right', padChar: ' ' },
    { name: "JENIS AGUNAN", label_cn: "抵押物类型", source: "Jenis Agunan", transform: "collateral_type", fixedLength: 2 },
    { name: "PERINGKAT AGUNAN", label_cn: "抵押物评级", source: "Peringkat Agunan", default: "", fixedLength: 6, padType: 'right', padChar: ' ' },
    { name: "NILAI AGUNAN", label_cn: "抵押物价值", source: "Nilai Agunan", transform: "amount", fixedLength: 15 },
    { name: "TANGGAL PENILAIAN", label_cn: "评估日期", source: "Tanggal Penilaian", transform: "date", fixedLength: 8 },
    { name: "NAMA PEMILIK AGUNAN", label_cn: "抵押物所有者", source: "Nama Pemilik Agunan", transform: "clean_name", fixedLength: 50, padType: 'right', padChar: ' ' },
    { name: "STATUS BUKTI KEPEMILIKAN", label_cn: "所有权证明状态", source: "Status Bukti Kepemilikan", fixedLength: 1 },
    { name: "NOMOR BUKTI KEPEMILIKAN", label_cn: "所有权证明编号", source: "Nomor Bukti Kepemilikan", fixedLength: 25, padType: 'right', padChar: ' ' },
    { name: "ALAMAT AGUNAN", label_cn: "抵押物地址", source: "Alamat Agunan", transform: "clean_address", fixedLength: 100, padType: 'right', padChar: ' ' },
    { name: "IKATAN AGUNAN", label_cn: "抵押绑定", source: "Ikatan Agunan", transform: "collateral_bond", fixedLength: 1 },
    { name: "NILAI IKATAN JAMINAN", label_cn: "抵押绑定价值", source: "Nilai Ikatan Jaminan", transform: "amount", fixedLength: 15 },
    { name: "TANGGAL IKATAN JAMINAN", label_cn: "抵押绑定日期", source: "Tanggal Ikatan Jaminan", transform: "date", fixedLength: 8 },
    { name: "KODE KANTOR CABANG", label_cn: "分行代码", source: "Kode Kantor Cabang", default: "001", fixedLength: 3 },
    { name: "OPERASI DATA", label_cn: "数据操作", source: "Operasi Data", default: "C", fixedLength: 1 }
];

/**
 * D02: Debitur Badan Usaha (29 Fields)
 */
export const D02_SCHEMA: SchemaField[] = [
    { name: "FLAG DETAIL", label_cn: "明细标志", default: "D", source: "Flag Detail", fixedLength: 1 },
    { name: "NOMOR CIF DEBITUR", label_cn: "客户号 (CIF)", source: "Nomor CIF Debitur", transform: "clean_numeric", fixedLength: 25, padType: 'right', padChar: ' ' },
    { name: "JENIS IDENTITAS", label_cn: "证件类型", default: "5", source: "Jenis Identitas", fixedLength: 1 },
    { name: "NOMOR IDENTITAS", label_cn: "证件号码", source: "Nomor Identitas", fixedLength: 25, padType: 'right', padChar: ' ' },
    { name: "NAMA BADAN USAHA", label_cn: "企业名称", source: "Nama Badan Usaha", transform: "clean_name", fixedLength: 50, padType: 'right', padChar: ' ' },
    { name: "KODE BENTUK BADAN USAHA", label_cn: "企业形式代码", source: "Kode Bentuk Badan Usaha", transform: "company_type", fixedLength: 2 },
    { name: "TEMPAT PENDIRIAN", label_cn: "成立地点", source: "Tempat Pendirian", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "TANGGAL AKTE PENDIRIAN", label_cn: "成立日期", source: "Tanggal Akte Pendirian", fixedLength: 8 },
    { name: "NOMOR AKTE PENDIRIAN", label_cn: "成立证书编号", source: "Nomor Akte Pendirian", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "NOMOR TELEPON", label_cn: "电话号码", source: "Nomor Telepon", transform: "phone", fixedLength: 15, padType: 'right', padChar: ' ' },
    { name: "NOMOR NPWP", label_cn: "税号 (NPWP)", source: "NPWP", fixedLength: 15 },
    { name: "ALAMAT", label_cn: "地址", source: "Alamat", transform: "clean_address", fixedLength: 100, padType: 'right', padChar: ' ' },
    { name: "KELURAHAN", label_cn: "村/社区", source: "Kelurahan", fixedLength: 35, padType: 'right', padChar: ' ' },
    { name: "KECAMATAN", label_cn: "镇/区", source: "Kecamatan", fixedLength: 35, padType: 'right', padChar: ' ' },
    { name: "KODE KABUPATEN/KOTA", label_cn: "市/县代码", source: "Kode Kabupaten atau Kota", transform: "city_code", fixedLength: 4 },
    { name: "KODE POS", label_cn: "邮政编码", source: "Kode Pos", transform: "zip_code", fixedLength: 5 },
    { name: "KODE NEGARA DOMISILI", label_cn: "居住国代码", default: "ID", source: "Kode Negara Domisili", fixedLength: 2 },
    { name: "KODE BIDANG USAHA", label_cn: "业务领域代码", source: "Kode Bidang Usaha", transform: "sector_code", fixedLength: 6 },
    { name: "KODE HUBUNGAN DENGAN PELAPOR", label_cn: "与申报机构关系代码", source: "Kode Hubungan", default: "20", fixedLength: 2 },
    { name: "MELANGGAR BMPK", label_cn: "违反 BMPK", source: "Melanggar BMPK", default: "2", fixedLength: 1 },
    { name: "MELAMPAUI BMPK", label_cn: "超过 BMPK", source: "Melampaui BMPK", default: "2", fixedLength: 1 },
    { name: "GO PUBLIC", label_cn: "上市标志", source: "Go Public", default: "2", fixedLength: 1 },
    { name: "KODE GOLONGAN DEBITUR", label_cn: "债务人分类代码", source: "Kode Golongan", default: "9", fixedLength: 1 },
    { name: "PERINGKAT DEBITUR", label_cn: "债务人评级", source: "Peringkat Debitur", default: "", fixedLength: 6, padType: 'right', padChar: ' ' },
    { name: "LEMBAGA PEMERINGKAT", label_cn: "评级机构", source: "Lembaga Pemeringkat", default: "", fixedLength: 6, padType: 'right', padChar: ' ' },
    { name: "TANGGAL PEMERINGKATAN", label_cn: "评级日期", source: "Tanggal Pemeringkatan", default: "", fixedLength: 8 },
    { name: "NAMA PENGURUS", label_cn: "负责人姓名", source: "Nama Pengurus", transform: "clean_name", fixedLength: 50, padType: 'right', padChar: ' ' },
    { name: "KODE KANTOR CABANG", label_cn: "分行代码", source: "Kode Kantor Cabang", default: "001", fixedLength: 3 },
    { name: "OPERASI DATA", label_cn: "数据操作", source: "Operasi Data", default: "C", fixedLength: 1 }
];

/**
 * F02: Fasilitas Kredit Badan Usaha (48 Fields)
 * 与 F01 相同
 */
export const F02_SCHEMA: SchemaField[] = F01_SCHEMA;

/**
 * K01: Kredit Luar Negeri (48 Fields)
 * 与 F01 相同
 */
export const K01_SCHEMA: SchemaField[] = F01_SCHEMA;

/**
 * M01: Surat Berharga (37 Fields)
 */
export const M01_SCHEMA: SchemaField[] = [
    { name: "FLAG DETAIL", label_cn: "明细标志", default: "D", source: "Flag Detail", fixedLength: 1 },
    { name: "NOMOR REKENING FASILITAS", label_cn: "账号/合同号", source: "Nomor Rekening Fasilitas", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "NOMOR CIF DEBITUR", label_cn: "客户号 (CIF)", source: "Nomor CIF Debitur", transform: "clean_numeric", fixedLength: 25, padType: 'right', padChar: ' ' },
    { name: "KODE SIFAT KREDIT", label_cn: "授信性质代码", source: "Kode Sifat Kredit", default: "1", fixedLength: 1 },
    { name: "KODE JENIS KREDIT", label_cn: "授信类型代码", source: "Kode Jenis Kredit", default: "20", fixedLength: 2 },
    { name: "KODE AKAD KREDIT", label_cn: "合同类型代码", source: "Kode Akad Kredit", default: "01", fixedLength: 2 },
    { name: "NOMOR AKAD AWAL", label_cn: "初始合同号", source: "Nomor Akad Awal", default: "", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "TANGGAL AKAD AWAL", label_cn: "初始合同日期", source: "Tanggal Akad Awal", default: "", fixedLength: 8 },
    { name: "NOMOR AKAD AKHIR", label_cn: "最终合同号", source: "Nomor Akad Akhir", default: "", fixedLength: 30, padType: 'right', padChar: ' ' },
    { name: "TANGGAL AKAD AKHIR", label_cn: "最终合同日期", source: "Tanggal Akad Akhir", default: "", fixedLength: 8 },
    { name: "FREKUENSI PERPANJANGAN", label_cn: "展期次数", source: "Frekuensi Perpanjangan", default: "0", fixedLength: 4 },
    { name: "TANGGAL AWAL KREDIT", label_cn: "授信开始日期", source: "Tanggal Awal Kredit", transform: "date", fixedLength: 8 },
    { name: "TANGGAL MULAI", label_cn: "开始日期", source: "Tanggal Mulai", transform: "date", fixedLength: 8 },
    { name: "TANGGAL JATUH TEMPO", label_cn: "到期日期", source: "Tanggal Jatuh Tempo", transform: "date", fixedLength: 8 },
    { name: "KODE KATEGORI DEBITUR", label_cn: "债务人类别代码", source: "Kode Kategori Debitur", default: "10", fixedLength: 2 },
    { name: "KODE JENIS PENGGUNAAN", label_cn: "使用类型代码", source: "Kode Jenis Penggunaan", default: "3", fixedLength: 1 },
    { name: "KODE ORIENTASI PENGGUNAAN", label_cn: "使用导向代码", source: "Kode Orientasi Penggunaan", default: "1", fixedLength: 1 },
    { name: "KODE SEKTOR EKONOMI", label_cn: "经济部门代码", source: "Kode Sektor Ekonomi", transform: "sector_code", fixedLength: 6 },
    { name: "KODE KABUPATEN/KOTA LOKASI", label_cn: "项目所在地代码", source: "Kode Kabupaten/Kota Lokasi", transform: "city_code", fixedLength: 4 },
    { name: "NILAI PROYEK", label_cn: "项目价值", source: "Nilai Proyek", default: "0", fixedLength: 15 },
    { name: "KODE VALUTA", label_cn: "币种代码", source: "Kode Valuta", default: "IDR", fixedLength: 3 },
    { name: "SUKU BUNGA ATAU IMBALAN", label_cn: "利率", source: "Suku Bunga atau Imbalan", transform: "format_interest", fixedLength: 5 },
    { name: "JENIS SUKU BUNGA", label_cn: "利率类型", source: "Jenis Suku Bunga", default: "1", fixedLength: 1 },
    { name: "KREDIT PROGRAM PEMERINTAH", label_cn: "政府项目信贷", source: "Kredit Program Pemerintah", default: "00", fixedLength: 2 },
    { name: "ASAL KREDIT TAKEOVER", label_cn: "接管自", source: "Asal Kredit Takeover", default: "", fixedLength: 6 },
    { name: "SUMBER DANA", label_cn: "资金来源代码", source: "Sumber Dana", default: "1", fixedLength: 1 },
    { name: "PLAFON AWAL", label_cn: "初始额度", source: "Plafon Awal", transform: "clean_numeric", fixedLength: 15 },
    { name: "PLAFON", label_cn: "当前额度", source: "Plafon", transform: "raw_zero", fixedLength: 15 },
    { name: "REALISASI BULAN BERJALAN", label_cn: "放款金额", source: "Realisasi Bulan Berjalan", fixedLength: 15 },
    { name: "DENDA", label_cn: "罚金", source: "Denda", transform: "amount", fixedLength: 15 },
    { name: "BAKI DEBET", label_cn: "未还本金", source: "Baki Debet", transform: "clean_numeric", fixedLength: 15 },
    { name: "NILAI DALAM MATA UANG ASAL", label_cn: "原币种价值", source: "Nilai Dalam Mata Uang Asal", default: "0", fixedLength: 15 },
    { name: "KODE KUALITAS KREDIT", label_cn: "五级分类代码", source: "Kode Kualitas Kredit", fixedLength: 1 },
    { name: "KODE KONDISI", label_cn: "状况代码", source: "Kode Kondisi", default: "00", fixedLength: 2 },
    { name: "TANGGAL KONDISI", label_cn: "状况日期", source: "Tanggal Kondisi", default: "", fixedLength: 8 },
    { name: "KETERANGAN", label_cn: "备注", source: "Keterangan", default: "", fixedLength: 100, padType: 'right', padChar: ' ' },
    { name: "KODE KANTOR CABANG", label_cn: "分行代码", source: "Kode Kantor Cabang", default: "001", fixedLength: 3 },
    { name: "OPERASI DATA", label_cn: "数据操作", source: "Operasi Data", default: "C", fixedLength: 1 }
];

// Segment Map for routing and configuration - MUST be at the end after all SCHEMA definitions
export const SEGMENT_MAP = {
  D01: { schema: D01_SCHEMA, keywords: ['D01', 'DEBITUR', 'PERSEORANGAN'] },
  F01: { schema: F01_SCHEMA, keywords: ['F01', 'FASILITAS', 'KREDIT'] },
  P01: { schema: P01_SCHEMA, keywords: ['P01', 'PENJAMIN'] },
  A01: { schema: A01_SCHEMA, keywords: ['A01', 'AGUNAN'] },
  D02: { schema: D02_SCHEMA, keywords: ['D02', 'BADAN', 'USAHA'] },
  F02: { schema: F02_SCHEMA, keywords: ['F02'] },
  K01: { schema: K01_SCHEMA, keywords: ['K01', 'LUAR', 'NEGERI'] },
  M01: { schema: M01_SCHEMA, keywords: ['M01', 'SURAT', 'BERHARGA'] }
};
