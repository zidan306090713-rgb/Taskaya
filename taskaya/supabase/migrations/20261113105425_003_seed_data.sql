insert into cities (id, name_ar, name_en) values
  ('00000000-0000-0000-0000-000000000001', 'العاشر من رمضان', '10th of Ramadan City');

insert into service_areas (city_id, name_ar, name_en) values
  ('00000000-0000-0000-0000-000000000001', 'الحي الأول', 'District 1'),
  ('00000000-0000-0000-0000-000000000001', 'الحي الثاني', 'District 2'),
  ('00000000-0000-0000-0000-000000000001', 'الحي الثالث', 'District 3'),
  ('00000000-0000-0000-0000-000000000001', 'الحي الرابع', 'District 4'),
  ('00000000-0000-0000-0000-000000000001', 'الحي الخامس', 'District 5');

insert into service_categories (id, name_ar, name_en, description_ar, description_en, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'التنظيف', 'Cleaning',
   'غسيل السجاد والمجالس والستائر والأثاث', 'Carpets, upholstery, curtains and furniture cleaning', 1),
  ('10000000-0000-0000-0000-000000000002', 'الخدمة المنزلية', 'Home Keeping',
   'تنظيف المنازل بشكل دوري أو عميق', 'Regular and deep home cleaning', 2),
  ('10000000-0000-0000-0000-000000000003', 'الصيانة المنزلية', 'Home Maintenance',
   'كهرباء وسباكة وتكييف وصيانة أجهزة', 'Electrical, plumbing, AC and appliance repair', 3);

insert into service_subcategories (category_id, name_ar, name_en, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'غسيل السجاد', 'Carpet Washing', 1),
  ('10000000-0000-0000-0000-000000000001', 'تنظيف المجالس', 'Upholstery Cleaning', 2),
  ('10000000-0000-0000-0000-000000000001', 'تنظيف الستائر', 'Curtains Cleaning', 3),
  ('10000000-0000-0000-0000-000000000001', 'تنظيف الأثاث', 'Furniture Cleaning', 4),
  ('10000000-0000-0000-0000-000000000002', 'تنظيف منزلي دوري', 'Regular Home Cleaning', 1),
  ('10000000-0000-0000-0000-000000000002', 'تنظيف عميق', 'Deep Cleaning', 2),
  ('10000000-0000-0000-0000-000000000002', 'تنظيف المطابخ', 'Kitchen Cleaning', 3),
  ('10000000-0000-0000-0000-000000000002', 'تنظيف الحمامات', 'Bathroom Cleaning', 4),
  ('10000000-0000-0000-0000-000000000002', 'تنظيف مجدول', 'Scheduled Cleaning', 5),
  ('10000000-0000-0000-0000-000000000003', 'كهرباء', 'Electrical', 1),
  ('10000000-0000-0000-0000-000000000003', 'سباكة', 'Plumbing', 2),
  ('10000000-0000-0000-0000-000000000003', 'صيانة التكييف', 'AC Maintenance', 3),
  ('10000000-0000-0000-0000-000000000003', 'صيانة الأجهزة', 'Appliance Repair', 4),
  ('10000000-0000-0000-0000-000000000003', 'إصلاحات عامة', 'General Repairs', 5);

insert into services (subcategory_id, name_ar, name_en)
select id, name_ar, name_en from service_subcategories;

insert into commission_rules (rate_percent) values (10);
