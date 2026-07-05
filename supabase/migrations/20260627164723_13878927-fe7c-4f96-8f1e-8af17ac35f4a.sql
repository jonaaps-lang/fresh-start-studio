
CREATE POLICY "Leitura pública dos arquivos da empresa"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

CREATE POLICY "Admin envia arquivos da empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin atualiza arquivos da empresa"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin remove arquivos da empresa"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));
