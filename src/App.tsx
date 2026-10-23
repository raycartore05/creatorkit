import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage, ContactPage, NotFoundPage, PrivacyPage, SizesGuidePage, TermsPage } from './pages/InfoPages';
import { ImageCompressorPage, ImageResizerPage, ProfileCropperPage } from './pages/toolPages1';
import { CaptionPage, OgPreviewPage, QrPage, WatermarkPage } from './pages/toolPages2';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tools/image-resizer" element={<ImageResizerPage />} />
        <Route path="/tools/image-compressor" element={<ImageCompressorPage />} />
        <Route path="/tools/profile-cropper" element={<ProfileCropperPage />} />
        <Route path="/tools/qr-code-generator" element={<QrPage />} />
        <Route path="/tools/og-preview" element={<OgPreviewPage />} />
        <Route path="/tools/caption-formatter" element={<CaptionPage />} />
        <Route path="/tools/watermark" element={<WatermarkPage />} />
        <Route path="/guides/social-media-image-sizes" element={<SizesGuidePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
