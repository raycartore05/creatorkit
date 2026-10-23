import { Link } from 'react-router-dom';
import { LIMITS } from '../config/site';
import { PRESETS_CHECKED_ON } from '../data/presets';
import { ToolPage } from '../components/ToolPage';
import { ImageResizer } from '../tools/ImageResizer';
import { ImageCompressor } from '../tools/ImageCompressor';
import { ProfileCropper } from '../tools/ProfileCropper';

const MB = LIMITS.maxFileBytes / 1024 / 1024;
const LOCAL = 'Your image is processed on this device. It is not uploaded to CreatorKit.';

export function ImageResizerPage() {
  return (
    <ToolPage
      slug="image-resizer"
      lede="Pick a platform size or enter your own, choose whether to fill the frame or fit the whole picture, drag to reposition, then download."
      privacyNote={LOCAL}
      faqs={[
        { q: 'Are these sizes guaranteed to work?', a: <>No. They are recommendations. Sizes marked as coming from a help page were checked on {PRESETS_CHECKED_ON}; the others are widely used but we could not confirm them on an official page. Platforms change layouts and may re-compress or crop uploads.</> },
        { q: 'Will my photo lose quality?', a: 'Shrinking an image keeps it sharp. Enlarging beyond the original resolution cannot add detail, so the tool warns you when that happens. JPEG and WebP also lose some detail at lower quality settings; 85–90% is usually indistinguishable from the original on a phone.' },
        { q: 'Why does part of my image disappear?', a: 'When the shape of your photo differs from the target, “Fill” crops the overflow. The tool shows roughly how much is cut off. Drag the preview to choose what stays, or switch to “Fit” to keep everything and add a border.' },
        { q: 'Can I keep a transparent background?', a: 'Yes. Choose PNG or WebP and set the background to Transparent. JPEG cannot store transparency, so transparent areas are filled with your chosen colour.' },
        { q: 'Does it work on my phone?', a: `Yes, in current versions of Safari, Chrome, Firefox and Edge. Very large images use a lot of memory, so files are limited to ${MB} MB and outputs to ${LIMITS.maxOutputPixels / 1e6} megapixels.` },
      ]}
      content={
        <>
          <h2>How to resize an image for social media</h2>
          <ol>
            <li>Choose an image from your device or drag it onto the page.</li>
            <li>Pick a size from the list, grouped by platform, or choose <strong>Custom size</strong> and type a width and height.</li>
            <li>Choose <strong>Fill</strong> to cover the whole frame (edges may be cropped) or <strong>Fit</strong> to keep the entire image (empty space is filled with a colour or transparency).</li>
            <li>Drag the preview, or use the zoom slider, to frame the important part. With the preview focused, the arrow keys nudge the image.</li>
            <li>Pick a file format and download.</li>
          </ol>
          <h2>Fill or fit: which should you use?</h2>
          <p>
            <strong>Fill</strong> is right for most posts and thumbnails, because platforms show the full frame and empty borders look unfinished. It works best when the subject sits in the middle of the photo. <strong>Fit</strong> is better for screenshots, infographics, product shots on plain backgrounds, or anything where cutting off text would be a problem. A background colour that matches your image edge makes the border less noticeable.
          </p>
          <h2>Choosing a format</h2>
          <ul>
            <li><strong>JPEG</strong>: photos and most posts. Small files, no transparency.</li>
            <li><strong>PNG</strong>: graphics with text, logos, screenshots and anything that needs transparency. Larger files for photos.</li>
            <li><strong>WebP</strong>: smaller than JPEG at similar quality and supports transparency. Most platforms accept it, but some still convert or reject it, so JPEG is the safest choice for uploads.</li>
          </ul>
          <p>
            For a full list of sizes and which ones we were able to verify, see the <Link to="/guides/social-media-image-sizes">social media image sizes guide</Link>.
          </p>
          <h2>Supported files and limits</h2>
          <p>
            JPEG, PNG, WebP and GIF (only the first frame of an animated GIF is used). Up to {MB} MB per file and {LIMITS.maxSourcePixels / 1e6} megapixels. Outputs can be up to {LIMITS.maxOutputSide} pixels on a side and {LIMITS.maxOutputPixels / 1e6} megapixels in total, which keeps the tool reliable on phones. SVG files are not accepted because they can contain scripts; export them as PNG first. iPhone HEIC photos need to be exported as JPEG.
          </p>
          <h2>Troubleshooting</h2>
          <ul>
            <li><strong>“Could not be read”</strong>: the file may be damaged or partly downloaded. Open it in your photo app and export a fresh copy.</li>
            <li><strong>The photo is sideways</strong>: CreatorKit uses your browser’s built-in orientation handling. If a photo still appears rotated, rotate and save it in your photo app first.</li>
            <li><strong>Downloads do nothing on iPhone</strong>: Safari shows a download prompt or saves to the Files app. Check Files › Downloads.</li>
            <li><strong>Colours look different after upload</strong>: platforms often re-compress images. Uploading at the recommended size usually reduces extra processing.</li>
          </ul>
          <h2>How it works</h2>
          <p>
            The image is drawn onto an HTML canvas in your browser at the exact output size, using the same geometry you see in the preview, and then encoded as your chosen file type. There is no server step: the file never leaves your device.
          </p>
        </>
      }
    >
      <ImageResizer />
    </ToolPage>
  );
}

export function ImageCompressorPage() {
  return (
    <ToolPage
      slug="image-compressor"
      lede="Reduce image file size by lowering quality, converting format or shrinking dimensions. The real saving is shown after compression, not guessed in advance."
      privacyNote={LOCAL}
      faqs={[
        { q: 'How much smaller will my image get?', a: 'It depends on the image. Photos straight from a camera or phone often shrink a lot; images that were already compressed may barely change. The tool shows the actual before and after size once it has processed your file.' },
        { q: 'Why did my PNG get bigger?', a: 'PNG is lossless, and browsers do not use the most aggressive PNG optimisation, so re-saving can produce a similar or larger file. For photos, convert to WebP or JPEG. For graphics, reducing the dimensions is the most effective option.' },
        { q: 'How does “Target size” work?', a: 'The tool tries several quality levels and keeps the highest quality that fits under your target. If even the lowest quality is too big, it tells you, and reducing the maximum width or height is the next step.' },
        { q: 'Is metadata (EXIF) removed?', a: 'Yes. Re-encoding through the browser canvas produces a new file without the original camera metadata such as GPS location. Colour profiles may also be converted to standard sRGB.' },
        { q: 'Can I compress many images at once?', a: 'Not yet. This first version handles one image at a time.' },
      ]}
      content={
        <>
          <h2>How to compress an image</h2>
          <ol>
            <li>Choose a JPEG, PNG or WebP image.</li>
            <li>Pick an output format. The tool starts with the same format as your file.</li>
            <li>For JPEG or WebP, choose <strong>Quality</strong> and set the slider, or choose <strong>Target size</strong> and enter a size in KB.</li>
            <li>Optionally set a maximum width or height. Resizing a 4000-pixel photo to 1600 pixels often saves more than any quality setting.</li>
            <li>Press <strong>Compress</strong>, compare the before and after, then download.</li>
          </ol>
          <h2>Quality versus file size</h2>
          <p>
            JPEG and WebP are “lossy”: they throw away detail the eye is less likely to notice. At high settings (85–95%) the difference is very hard to see. Around 60–75%, files get much smaller and most photos still look fine on a phone screen, but you may notice blockiness in skies, gradients or around text. Below about 50%, artefacts become obvious. Graphics with sharp edges and text suffer first; photos of natural scenes hide compression best.
          </p>
          <p>
            Always zoom into the “After” preview before using an image somewhere important. If text looks fuzzy, raise the quality or use PNG for that image.
          </p>
          <h2>Which format gives the smallest file?</h2>
          <ul>
            <li><strong>WebP</strong> is usually the smallest at similar visual quality, and keeps transparency. Use it for websites. Some upload forms still don’t accept it.</li>
            <li><strong>JPEG</strong> is the most widely accepted format for photos.</li>
            <li><strong>PNG</strong> is best for screenshots and graphics with large flat areas, and is the only choice here for perfect, lossless quality.</li>
          </ul>
          <h2>Common situations</h2>
          <ul>
            <li><strong>A form requires a file under a limit</strong> (for example 200 KB or 2 MB): use Target size, and set a maximum dimension if needed.</li>
            <li><strong>Website images</strong>: set a maximum width close to how wide the image is displayed (often 1200–2000 px) and use WebP at 75–85%.</li>
            <li><strong>Email attachments</strong>: a maximum dimension of 1600–2000 px and JPEG at 80% keeps photos clear and small.</li>
          </ul>
          <h2>Supported files and limits</h2>
          <p>
            JPEG, PNG and WebP (GIF uses the first frame). Up to {MB} MB. WebP output depends on your browser; if it is unavailable the option is disabled. The image is decoded and re-encoded by your browser, so results can differ slightly between Chrome, Safari and Firefox.
          </p>
          <h2>How it works</h2>
          <p>
            Your image is drawn onto a canvas in your browser and encoded with the browser’s own JPEG, WebP or PNG encoder. Nothing is uploaded. Because the file is re-created, transparent areas are filled with a colour when saving as JPEG, and camera metadata is not carried over.
          </p>
        </>
      }
    >
      <ImageCompressor />
    </ToolPage>
  );
}

export function ProfileCropperPage() {
  return (
    <ToolPage
      slug="profile-cropper"
      lede="Frame your face inside a circle preview, check how it looks at small sizes, then download a square or circular image. Cover and banner sizes are included too."
      privacyNote={LOCAL}
      faqs={[
        { q: 'Should I upload a circle or a square?', a: 'Upload a square to social platforms. They apply the circular crop themselves, and a pre-cut circle can end up with visible corners or a double border. The circle download is for places that show your image as-is, such as slides or email signatures.' },
        { q: 'What size should my profile picture be?', a: 'Profile pictures are shown small, but platforms often display them larger on your profile page and on high-density screens. 800 × 800 or 1080 × 1080 pixels is a comfortable size that most platforms accept.' },
        { q: 'Why does the platform crop it differently?', a: 'Each platform positions and scales profile pictures in its own way, and many use different crops on mobile and desktop. The preview is an approximation, so check the result after uploading.' },
        { q: 'How do I position the photo?', a: 'Drag the preview, or click it and use the arrow keys (hold Shift for bigger steps). Use the zoom slider, or the + and − keys, to get closer.' },
      ]}
      content={
        <>
          <h2>How to crop a profile picture</h2>
          <ol>
            <li>Choose a photo. A well-lit photo where your face fills a good part of the frame works best.</li>
            <li>Select a size. Square sizes show a circular guide.</li>
            <li>Zoom in and drag until your face sits in the centre of the circle, with a little space above your head.</li>
            <li>Check the small previews. At 40 pixels, a busy background or a far-away face becomes hard to recognise.</li>
            <li>Download as a square (for social platforms) or as a circle with transparent corners.</li>
          </ol>
          <h2>Tips for a clear profile picture</h2>
          <ul>
            <li><strong>Fill the circle.</strong> Head and shoulders usually read better than a full-body shot.</li>
            <li><strong>Keep the background simple.</strong> Plain or blurred backgrounds stand out at small sizes.</li>
            <li><strong>Use the same photo across platforms</strong> so people recognise you.</li>
            <li><strong>Watch the edges.</strong> Anything outside the circle will be hidden on most platforms.</li>
          </ul>
          <h2>Cover photos and banners</h2>
          <p>
            Banner options (Facebook cover, LinkedIn background, YouTube channel banner and an X header) let you frame a wide image. Banners are cropped differently on phones and desktops, and profile pictures or buttons often overlap one corner, so keep text and logos near the centre. See the <Link to="/guides/social-media-image-sizes">image sizes guide</Link> for notes on each.
          </p>
          <h2>Supported files and limits</h2>
          <p>
            JPEG, PNG, WebP and GIF (first frame). Up to {MB} MB. Circle downloads are always PNG, because only PNG and WebP can keep the transparent corners; WebP is also available.
          </p>
          <h2>How it works</h2>
          <p>
            The tool fills the chosen frame with your image (so there are no empty edges), lets you move and scale it, and draws the result onto a canvas in your browser. For circle downloads, everything outside the circle is made transparent. Nothing is sent to a server.
          </p>
        </>
      }
    >
      <ProfileCropper />
    </ToolPage>
  );
}
