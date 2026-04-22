import type { GalleryImage } from './types';

/**
 * Opens an image in a new browser window with full details and delete capability.
 */
export function openImageInNewWindow(image: GalleryImage): void {
  const newWindow = window.open('', '_blank');
  if (!newWindow) return;

  newWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${image.name}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .image-info {
            margin-bottom: 20px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 4px;
          }
          .image-info h2 {
            margin: 0 0 10px 0;
            color: #333;
          }
          .image-info p {
            margin: 5px 0;
            color: #666;
          }
          .image-container {
            text-align: center;
            margin: 20px 0;
          }
          .image-container img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .actions {
            margin-top: 20px;
            text-align: center;
          }
          .btn {
            padding: 10px 20px;
            margin: 0 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .btn-delete {
            background: #d32f2f;
            color: white;
          }
          .btn-delete:hover {
            background: #b71c1c;
          }
          .btn-close {
            background: #666;
            color: white;
          }
          .btn-close:hover {
            background: #444;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="image-info">
            <h2>Image Information</h2>
            <p><strong>Image Name:</strong> ${image.name}</p>
            <p><strong>Image Path:</strong> ${image.path}</p>
            <p><strong>Image Type:</strong> ${image.type || 'Unknown'}</p>
            ${image.size ? `<p><strong>Image Size:</strong> ${(image.size / 1024).toFixed(2)} KB</p>` : ''}
            ${image.created ? `<p><strong>Created:</strong> ${new Date(image.created).toLocaleString()}</p>` : ''}
          </div>
          <div class="image-container">
            <img src="${image.url}" alt="${image.name}" onerror="this.src='/images/incode/placeholder.png'" />
          </div>
          <div class="actions">
            <button class="btn btn-delete" onclick="deleteImage()">Delete Image</button>
            <button class="btn btn-close" onclick="window.close()">Close</button>
          </div>
        </div>
        <script>
          function deleteImage() {
            if (confirm('Are you sure you want to delete this image?')) {
              const relativePath = '${image.path}'.replace(/^\\/images\\//, '');
              fetch('/api/gallery/file', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ path: relativePath })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  alert('Image deleted successfully');
                  window.close();
                  if (window.opener) {
                    window.opener.location.reload();
                  }
                } else {
                  alert('Failed to delete image: ' + (data.message || 'Unknown error'));
                }
              })
              .catch(error => {
                console.error('Error:', error);
                alert('Failed to delete image');
              });
            }
          }
        </script>
      </body>
    </html>
  `);
  newWindow.document.close();
}
