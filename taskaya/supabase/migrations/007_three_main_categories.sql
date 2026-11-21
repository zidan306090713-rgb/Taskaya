-- 007: الأقسام الرئيسية بقت 3: مغاسل السجاد، هاوس كيبينج، الفنيين (نفس الـ ids)
update public.service_categories set
  name_ar = 'مغاسل السجاد', name_en = 'Carpet Cleaning',
  description_ar = 'غسيل السجاد والموكيت والمجالس والستائر', description_en = 'Carpets, rugs, majlis and curtains cleaning'
where id = '10000000-0000-0000-0000-000000000001';

update public.service_categories set
  name_ar = 'هاوس كيبينج', name_en = 'Housekeeping',
  description_ar = 'تنظيف منزلي دوري وعميق للمطابخ والحمامات', description_en = 'Regular and deep home cleaning'
where id = '10000000-0000-0000-0000-000000000002';

update public.service_categories set
  name_ar = 'الفنيين', name_en = 'Technicians',
  description_ar = 'كهرباء، سباكة، تكييف، وصيانة الأجهزة', description_en = 'Electrical, plumbing, AC and appliance repair'
where id = '10000000-0000-0000-0000-000000000003';
