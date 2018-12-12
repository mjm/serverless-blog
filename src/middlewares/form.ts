import Busboy from "busboy";

const formDataParser = () => {
  return {
    async before(handler) {
      let event = handler.event;
      if (!isFormRequest(event)) {
        return;
      }

      let body = {};
      let files = [];

      const addField = (field, value) => {
        if (field.endsWith('[]')) {
          const key = field.slice(0, -2);
          if (body[key]) {
            body[key].push(value);
          } else {
            body[key] = [value];
          }
        } else {
          body[field] = value;
        }
      };

      await new Promise<void>((resolve, reject) => {
        const busboy = new Busboy({
          headers: {
            'content-type': event.headers['Content-Type']
          }
        });

        busboy.on('field', (field, value) => {
          console.log('Got form field', field, value);
          addField(field, value);
        });

        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
          fieldname = fieldname.replace(/\[\]$/, '');
          console.log('Got file upload', fieldname, filename);
          let buffers: Buffer[] = [];

          file.on('data', chunk => {
            if (typeof chunk === 'string') {
              buffers.push(Buffer.from(chunk));
            } else {
              buffers.push(chunk)
            }
          });

          file.on('end', () => {
            files.push({
              field: fieldname,
              filename,
              mimetype,
              body: Buffer.concat(buffers)
            });
          });
        });

        busboy.on('finish', () => {
          console.log('Done processing form');
          event.body = body;
          event.uploadedFiles = files;
          resolve();
        });

        busboy.write(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
        busboy.end();
      });
    }
  };
}

export default formDataParser;

function isFormRequest(event): boolean {
  const contentType = event.headers['Content-Type'];
  return contentType.startsWith('application/x-www-form-urlencoded')
      || contentType.startsWith('multipart/form-data');
}
