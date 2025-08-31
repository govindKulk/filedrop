// backend/src/services/emailService.ts
import { SESClient, SendEmailCommand, type SendEmailCommandInput } from '@aws-sdk/client-ses';

const sesClient = new SESClient({});

export interface EmailTemplate {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export class EmailService {
  private readonly fromEmail = 'noreply@govindkulkarni.me';

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      const params: SendEmailCommandInput = {
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [template.to],
        },
        Message: {
          Subject: {
            Data: template.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: template.htmlBody,
              Charset: 'UTF-8',
            },
          },
        },
      };

      if (template.textBody) {
        params.Message!.Body!.Text = {
          Data: template.textBody,
          Charset: 'UTF-8',
        };
      }

      const result = await sesClient.send(new SendEmailCommand(params));
      console.log('Email sent successfully:', result.MessageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  generateUploadSuccessEmail(fileName: string, userEmail: string): EmailTemplate {
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #007bff; }
          .content { line-height: 1.6; color: #333; }
          .file-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FileDrop</div>
            <p>Secure File Sharing Platform</p>
          </div>

          <div class="content">
            <h2>File Upload Successful! 🎉</h2>

            <p>Great news! Your file has been uploaded successfully to FileDrop.</p>

            <div class="file-info">
              <strong>📁 File Details:</strong><br>
              <strong>Name:</strong> ${fileName}<br>
              <strong>Uploaded:</strong> ${new Date().toLocaleString()}<br>
              <strong>Status:</strong> Ready for sharing
            </div>

            <p>Your file is now securely stored and ready to be accessed. You can:</p>
            <ul>
              <li>📋 View all your files in your dashboard</li>
              <li>📥 Generate download links</li>
              <li>🗑️ Delete files when no longer needed</li>
            </ul>

            <p>Thank you for using FileDrop!</p>
          </div>

          <div class="footer">
            <p>This is an automated message from FileDrop.<br>
            If you didn't upload this file, please contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
File Upload Successful!

Your file "${fileName}" has been uploaded successfully to FileDrop.
Upload Date: ${new Date().toLocaleString()}

You can now access your file through the FileDrop dashboard.

Thank you for using FileDrop!
    `;

    return {
      to: userEmail,
      subject: `File Upload Successful - ${fileName}`,
      htmlBody,
      textBody,
    };
  }

  generateWelcomeEmail(userEmail: string, firstName?: string): EmailTemplate {
    const name = firstName || userEmail.split('@')[0];

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #007bff; }
          .content { line-height: 1.6; color: #333; }
          .features { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FileDrop</div>
            <p>Secure File Sharing Platform</p>
          </div>

          <div class="content">
            <h2>Welcome to FileDrop, ${name}! 👋</h2>

            <p>Thank you for joining FileDrop! Your account has been successfully created and verified.</p>

            <div class="features">
              <h3>What you can do with FileDrop:</h3>
              <ul>
                <li>🔒 <strong>Secure Upload:</strong> Upload files with enterprise-grade security</li>
                <li>📤 <strong>Easy Sharing:</strong> Generate secure download links</li>
                <li>📊 <strong>File Management:</strong> Organize and track your uploads</li>
                <li>📧 <strong>Notifications:</strong> Get notified about file activities</li>
                <li>🗑️ <strong>Control:</strong> Delete files anytime</li>
              </ul>
            </div>

            <p>Start by uploading your first file and experience secure file sharing!</p>
          </div>

          <div class="footer">
            <p>Welcome to the FileDrop community!<br>
            Need help? Contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: userEmail,
      subject: 'Welcome to FileDrop - Your Account is Ready!',
      htmlBody,
      textBody: `Welcome to FileDrop, ${name}! Your secure file sharing account is now ready to use.`,
    };
  }
}
