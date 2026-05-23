// server/utils/emailService.js
const nodemailer = require('nodemailer');
const path = require('path');
const { getActiveEmailConfig } = require('../api/settings');

// Email templates
const getOCRReceiptTemplate = (sessionInfo, results) => {
  const { sessionId, recordType, churchId, userEmail, expiresAt } = sessionInfo;
  const { processedImages, extractedText, translatedText, confidence } = results;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #8c249d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .result-card { background: #f9f9f9; border-left: 4px solid #8c249d; padding: 15px; margin: 10px 0; }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
        .download-link { background: #8c249d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        .metadata { background: #e8f4f8; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 OCR Processing Complete</h1>
        <p>Orthodox Church Records Management System</p>
    </div>
    
    <div class="content">
        <h2>Hello!</h2>
        <p>Your document OCR processing has been completed successfully. Here are the results:</p>
        
        <div class="metadata">
            <h3>📋 Session Details</h3>
            <p><strong>Session ID:</strong> ${sessionId}</p>
            <p><strong>Record Type:</strong> ${recordType.charAt(0).toUpperCase() + recordType.slice(1)}</p>
            <p><strong>Church ID:</strong> ${churchId}</p>
            <p><strong>Processed:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Images Processed:</strong> ${processedImages || 0}</p>
        </div>

        ${extractedText ? `
        <div class="result-card">
            <h3>🔍 Extracted Text</h3>
            <pre style="white-space: pre-wrap; font-family: monospace; background: white; padding: 10px; border-radius: 3px;">${extractedText}</pre>
            ${confidence ? `<p><em>Confidence Score: ${Math.round(confidence * 100)}%</em></p>` : ''}
        </div>
        ` : ''}

        ${translatedText ? `
        <div class="result-card">
            <h3>🌐 Translated Text</h3>
            <pre style="white-space: pre-wrap; font-family: monospace; background: white; padding: 10px; border-radius: 3px;">${translatedText}</pre>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/ocr/results/${sessionId}" class="download-link">
                📥 Download Full Results
            </a>
        </div>
        
        <p><em>⏰ Note: This download link will expire on ${new Date(expiresAt).toLocaleDateString()} for security reasons.</em></p>
        
        <h3>Next Steps:</h3>
        <ul>
            <li>Review the extracted text for accuracy</li>
            <li>Download the processed results before expiry</li>
            <li>Contact your church administrator if you need assistance</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Church Records Management System</p>
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
  `;
};

// Create transporter with dynamic configuration
const createTransporter = async () => {
  try {
    // Try to get configuration from database first
    const dbConfig = await getActiveEmailConfig();
    
    if (dbConfig) {
      console.log(`📧 Using database email config: ${dbConfig.provider} (${dbConfig.smtp_host}:${dbConfig.smtp_port})`);
      
      // Only include auth if password is provided and not empty
      const hasPassword = dbConfig.smtp_pass && dbConfig.smtp_pass.trim() !== '';
      
      if (!hasPassword) {
        console.warn('⚠️ No SMTP password found in database config - email sending may fail');
      }
      
      const config = {
        host: dbConfig.smtp_host,
        port: dbConfig.smtp_port,
        secure: dbConfig.smtp_secure,
      };
      
      // Only add auth if we have both user and password
      if (dbConfig.smtp_user && hasPassword) {
        config.auth = {
          user: dbConfig.smtp_user,
          pass: dbConfig.smtp_pass,
        };
      } else if (dbConfig.smtp_user) {
        // User but no password - this will likely fail, but we'll let nodemailer handle it
        console.warn('⚠️ SMTP user configured but password is missing');
        config.auth = {
          user: dbConfig.smtp_user,
          pass: '',
        };
      }

      return nodemailer.createTransport(config);
    } else {
      // Fallback to environment variables
      console.log('📧 Using environment variable email config (fallback)');
      
      const config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || process.env.EMAIL_USER,
          pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
        },
      };

      return nodemailer.createTransport(config);
    }
  } catch (error) {
    console.error('Failed to get email config from database, using environment variables:', error);
    
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    };

    return nodemailer.createTransport(config);
  }
};

// Send OCR receipt email
const sendOCRReceipt = async (sessionInfo, results, attachments = []) => {
  try {
    const transporter = await createTransporter();
    const { userEmail, sessionId, recordType } = sessionInfo;

    if (!userEmail) {
      throw new Error('No email address provided for receipt');
    }

    // Get sender info from database config or fallback to environment
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Church Records';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: userEmail,
      subject: `OCR Processing Complete - ${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Record (${sessionId.substring(0, 8)})`,
      html: getOCRReceiptTemplate(sessionInfo, results),
      attachments: attachments // Array of {filename, content, contentType}
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ OCR receipt email sent:', {
      messageId: info.messageId,
      to: userEmail,
      sessionId: sessionId
    });

    return {
      success: true,
      messageId: info.messageId,
      recipient: userEmail
    };

  } catch (error) {
    console.error('❌ Error sending OCR receipt email:', error);
    throw error;
  }
};

// Send session verification email
const sendSessionVerification = async (sessionInfo) => {
  try {
    const transporter = await createTransporter();
    const { userEmail, sessionId, pin, expiresAt, recordType } = sessionInfo;

    if (!userEmail) {
      return { success: false, reason: 'No email provided' };
    }

    const verificationTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #8c249d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .pin-box { background: #f0f8ff; border: 2px solid #8c249d; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
        .pin { font-size: 24px; font-weight: bold; color: #8c249d; letter-spacing: 3px; }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Session Verification</h1>
        <p>Orthodox Church Records Management System</p>
    </div>
    
    <div class="content">
        <h2>Your OCR Session is Ready</h2>
        <p>A new OCR session has been created for processing your ${recordType} records.</p>
        
        <div class="pin-box">
            <h3>📱 Verification PIN</h3>
            <div class="pin">${pin}</div>
            <p>Use this PIN to verify your session when scanning the QR code</p>
        </div>
        
        <h3>📋 Session Details:</h3>
        <ul>
            <li><strong>Session ID:</strong> ${sessionId}</li>
            <li><strong>Record Type:</strong> ${recordType.charAt(0).toUpperCase() + recordType.slice(1)}</li>
            <li><strong>Expires:</strong> ${new Date(expiresAt).toLocaleString()}</li>
        </ul>
        
        <h3>🚀 How to Use:</h3>
        <ol>
            <li>Scan the QR code displayed on the screen</li>
            <li>Enter the PIN: <strong>${pin}</strong></li>
            <li>Upload your document images</li>
            <li>Wait for processing to complete</li>
            <li>Receive your results via email</li>
        </ol>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Church Records Management System</p>
        <p>This PIN will expire on ${new Date(expiresAt).toLocaleString()}</p>
    </div>
</body>
</html>
    `;

    // Get sender info from database config or fallback to environment
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Church Records';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: userEmail,
      subject: `OCR Session Created - PIN: ${pin}`,
      html: verificationTemplate
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Session verification email sent:', {
      messageId: info.messageId,
      to: userEmail,
      sessionId: sessionId
    });

    return {
      success: true,
      messageId: info.messageId,
      recipient: userEmail
    };

  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

// Send error notification email
const sendErrorNotification = async (sessionInfo, error) => {
  try {
    const transporter = await createTransporter();
    const { userEmail, sessionId, recordType } = sessionInfo;

    if (!userEmail) {
      return { success: false, reason: 'No email provided' };
    }

    const errorTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .error-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚠️ OCR Processing Error</h1>
        <p>Orthodox Church Records Management System</p>
    </div>
    
    <div class="content">
        <h2>Processing Error Occurred</h2>
        <p>We encountered an issue while processing your ${recordType} records.</p>
        
        <div class="error-box">
            <h3>🔍 Error Details:</h3>
            <p><strong>Session ID:</strong> ${sessionId}</p>
            <p><strong>Error:</strong> ${error.message || 'Unknown error occurred'}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>🛠️ What to do next:</h3>
        <ul>
            <li>Check that your images are clear and readable</li>
            <li>Ensure images are in supported formats (JPG, PNG, PDF)</li>
            <li>Try creating a new session and re-uploading</li>
            <li>Contact support if the problem persists</li>
        </ul>
        
        <p>We apologize for the inconvenience. Please try again or contact your church administrator for assistance.</p>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Church Records Management System</p>
        <p>Session ID: ${sessionId}</p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Orthodox Church Records" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `OCR Processing Error - Session ${sessionId.substring(0, 8)}`,
      html: errorTemplate
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Error notification email sent:', {
      messageId: info.messageId,
      to: userEmail,
      sessionId: sessionId
    });

    return {
      success: true,
      messageId: info.messageId,
      recipient: userEmail
    };

  } catch (emailError) {
    console.error('❌ Error sending error notification email:', emailError);
    return { success: false, error: emailError.message };
  }
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return { success: false, error: error.message };
  }
};

// OMAI Task Assignment Email Templates
const getTaskAssignmentTemplate = (taskURL, email) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #8c249d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { 
            display: inline-block; 
            background: #8c249d; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
            font-weight: bold;
        }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
        .highlight { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📝 Task Assignment Invitation</h1>
        <p>Orthodox Metrics AI System</p>
    </div>
    
    <div class="content">
        <h2>Hello!</h2>
        <p>You've been invited to assign tasks to Nick through the OMAI Task Assignment System.</p>
        
        <div class="highlight">
            <h3>🎯 How it works:</h3>
            <ul>
                <li><strong>Click the link below</strong> to access your secure task form</li>
                <li><strong>Add multiple tasks</strong> with titles, descriptions, and priorities</li>
                <li><strong>Submit instantly</strong> - tasks are sent directly to Nick at next1452@gmail.com</li>
                <li><strong>No account required</strong> - just use this secure link</li>
            </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${taskURL}" class="button">
                📋 Assign Tasks to Nick
            </a>
        </div>
        
        <p><strong>Direct Link:</strong> <a href="${taskURL}">${taskURL}</a></p>
        
        <div class="highlight">
            <h3>📋 Task Priorities Available:</h3>
            <ul>
                <li><strong>🔥 High Priority</strong> - Urgent tasks requiring immediate attention</li>
                <li><strong>⚠️ Medium Priority</strong> - Standard tasks for regular workflow</li>
                <li><strong>🧊 Low Priority</strong> - Nice-to-have tasks for when time permits</li>
            </ul>
        </div>
        
        <p><em>⏰ Note: This link expires in 30 days for security reasons.</em></p>
        
        <h3>Questions?</h3>
        <p>If you have any questions about the task assignment system, please contact Nick directly at next1452@gmail.com.</p>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Metrics AI System</p>
        <p>This is an automated message from OMAI.</p>
        <p>Recipient: ${email}</p>
    </div>
</body>
</html>
  `;
};

const getTaskSubmissionTemplate = (fromEmail, tasks, submissionId) => {
  const OMAIRequest = require('./OMAIRequest');
  const tasksHTML = OMAIRequest.formatTasksForEmail(tasks);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #8c249d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .task-list { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
        .metadata { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .priority-high { border-left: 4px solid #ff4444; }
        .priority-medium { border-left: 4px solid #ff9944; }
        .priority-low { border-left: 4px solid #44ff44; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📬 New Task Assignment</h1>
        <p>OMAI Task Assignment System</p>
    </div>
    
    <div class="content">
        <h2>Hi Nick!</h2>
        <p>You have received ${tasks.length} new task${tasks.length > 1 ? 's' : ''} through the OMAI Task Assignment System.</p>
        
        <div class="metadata">
            <h3>📋 Submission Details</h3>
            <p><strong>From:</strong> ${fromEmail}</p>
            <p><strong>Submission ID:</strong> #${submissionId}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Tasks:</strong> ${tasks.length}</p>
        </div>

        <div class="task-list">
            <h3>🎯 Tasks Assigned:</h3>
            ${tasksHTML}
        </div>
        
        <h3>📊 Quick Summary:</h3>
        <ul>
            <li><strong>🔥 High Priority:</strong> ${tasks.filter(t => ['🔥', 'high'].includes(t.priority)).length} tasks</li>
            <li><strong>⚠️ Medium Priority:</strong> ${tasks.filter(t => ['⚠️', 'medium'].includes(t.priority)).length} tasks</li>
            <li><strong>🧊 Low Priority:</strong> ${tasks.filter(t => ['🧊', 'low'].includes(t.priority)).length} tasks</li>
        </ul>
        
        <h3>Next Steps:</h3>
        <ul>
            <li>Review the task priorities and descriptions</li>
            <li>Contact ${fromEmail} if you need clarification on any tasks</li>
            <li>Add tasks to your preferred project management system</li>
        </ul>
        
        <p><em>💡 Tip: You can reply directly to ${fromEmail} from this email to discuss the tasks.</em></p>
    </div>
    
    <div class="footer">
        <p>© 2025 Orthodox Metrics AI System</p>
        <p>This task assignment was processed automatically by OMAI.</p>
        <p>Submission ID: #${submissionId} | Generated: ${new Date().toISOString()}</p>
    </div>
</body>
</html>
  `;
};

// Send task assignment email
const sendTaskAssignmentEmail = async (email, taskURL, token) => {
  try {
    const transporter = await createTransporter();
    const htmlContent = getTaskAssignmentTemplate(taskURL, email);

    // Get sender info from database config or fallback
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'OMAI Task System';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: email,
      subject: '📝 Task Assignment Invitation - Orthodox Metrics AI',
      html: htmlContent,
      headers: {
        'X-OMAI-Type': 'task-assignment',
        'X-OMAI-Token': token.substring(0, 8) + '...',
        'X-Priority': '1'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Task assignment email sent to ${email}:`, info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      email: email
    };
  } catch (error) {
    console.error(`❌ Failed to send task assignment email to ${email}:`, error);
    throw error;
  }
};

// Send task submission email to Nick
const sendTaskSubmissionEmail = async (fromEmail, tasks, submissionId) => {
  try {
    const transporter = await createTransporter();
    const htmlContent = getTaskSubmissionTemplate(fromEmail, tasks, submissionId);

    // Get sender info from database config or fallback
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'OMAI Task System';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: 'next1452@gmail.com',
      replyTo: fromEmail,
      subject: `📬 New Task Assignment from ${fromEmail} (${tasks.length} tasks)`,
      html: htmlContent,
      headers: {
        'X-OMAI-Type': 'task-submission',
        'X-OMAI-Submission': submissionId,
        'X-OMAI-From': fromEmail,
        'X-OMAI-Task-Count': tasks.length,
        'X-Priority': '1'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Task submission email sent to Nick from ${fromEmail}:`, info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      from: fromEmail,
      taskCount: tasks.length
    };
  } catch (error) {
    console.error(`❌ Failed to send task submission email from ${fromEmail}:`, error);
    throw error;
  }
};

// Send task creation email notification
const sendTaskCreationEmail = async (task, createdByEmail) => {
  try {
    const transporter = await createTransporter();
    
    // Build email content
    const taskUrl = `${process.env.FRONTEND_URL || 'https://orthodoxmetrics.com'}/devel-tools/om-tasks`;
    const adminUrl = `${process.env.FRONTEND_URL || 'https://orthodoxmetrics.com'}/admin/settings`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8c249d; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; color: #555; }
    .value { margin-left: 10px; }
    .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
    .tag { background: #e0e0e0; padding: 3px 8px; border-radius: 3px; font-size: 0.9em; }
    .button { display: inline-block; padding: 10px 20px; background: #8c249d; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📝 New OM Task Created</h2>
    </div>
    <div class="content">
      <div class="field">
        <span class="label">Title:</span>
        <span class="value">${task.title}</span>
      </div>
      <div class="field">
        <span class="label">Category:</span>
        <span class="value">${task.category}</span>
      </div>
      <div class="field">
        <span class="label">Type:</span>
        <span class="value">${task.type}</span>
      </div>
      <div class="field">
        <span class="label">Visibility:</span>
        <span class="value">${task.visibility}</span>
      </div>
      <div class="field">
        <span class="label">Importance:</span>
        <span class="value">${task.importance}</span>
      </div>
      <div class="field">
        <span class="label">Status:</span>
        <span class="value">${task.status}</span>
      </div>
      <div class="field">
        <span class="label">Tags:</span>
        <div class="tags">
          ${(task.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="field">
        <span class="label">Details:</span>
        <div class="value" style="white-space: pre-wrap; background: white; padding: 10px; border-radius: 3px; margin-top: 5px;">
          ${task.details.substring(0, 500)}${task.details.length > 500 ? '...' : ''}
        </div>
      </div>
      ${task.assigned_to ? `
      <div class="field">
        <span class="label">Assigned To:</span>
        <span class="value">${task.assigned_to}</span>
      </div>
      ` : ''}
      ${task.assigned_by ? `
      <div class="field">
        <span class="label">Assigned By:</span>
        <span class="value">${task.assigned_by}</span>
      </div>
      ` : ''}
      ${task.notes ? `
      <div class="field">
        <span class="label">Notes:</span>
        <div class="value" style="white-space: pre-wrap;">${task.notes}</div>
      </div>
      ` : ''}
      <div class="field">
        <span class="label">Created By:</span>
        <span class="value">${createdByEmail}</span>
      </div>
      <div class="field">
        <span class="label">Created At:</span>
        <span class="value">${new Date(task.created_at).toLocaleString()}</span>
      </div>
      
      <a href="${taskUrl}" class="button">View Task in Admin Panel</a>
    </div>
    <div class="footer">
      <p>This is an automated notification from the OM Tasks system.</p>
      <p>Task ID: ${task.id}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Get sender info from database config or fallback
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'OMAI Task System';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: 'info@orthodoxmetrics.com',
      subject: `[OM-TASKS] New Task Created: ${task.title} (${task.category} / ${task.type} / ${task.visibility})`,
      html: htmlContent,
      headers: {
        'X-OMAI-Type': 'task-creation',
        'X-OMAI-Task-Id': task.id,
        'X-OMAI-Task-Type': task.type,
        'X-OMAI-Task-Visibility': task.visibility,
        'X-Priority': '1'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Task creation email sent to info@orthodoxmetrics.com for task ${task.id}:`, info.messageId);
    
    return {
      success: true,
      messageId: info.messageId,
      taskId: task.id
    };
  } catch (error) {
    console.error(`❌ Failed to send task creation email for task ${task.id}:`, error);
    throw error;
  }
};

// Send backup completion/failure notification email
const sendBackupNotification = async (notificationEmail, jobInfo) => {
  try {
    if (!notificationEmail) {
      return { success: false, reason: 'No notification email configured' };
    }

    const transporter = await createTransporter();
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Metrics System';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    if (!senderEmail) {
      return { success: false, reason: 'No sender email configured. Configure email in OM Tasks settings.' };
    }

    const { jobId, kind, status, durationMs, error: jobError } = jobInfo;
    const isSuccess = status === 'success';
    const kindLabel = kind === 'borg' ? 'Borg' : kind === 'both' ? 'Full' : kind === 'db' ? 'Database' : 'Files';
    const statusEmoji = isSuccess ? '✅' : '❌';
    const durationStr = durationMs ? `${(durationMs / 1000).toFixed(1)}s` : 'N/A';

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: notificationEmail,
      subject: `${statusEmoji} Backup ${isSuccess ? 'Completed' : 'Failed'} - ${kindLabel} (#${jobId})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: ${isSuccess ? '#4caf50' : '#f44336'}; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .detail-card { background: #f9f9f9; border-left: 4px solid ${isSuccess ? '#4caf50' : '#f44336'}; padding: 15px; margin: 10px 0; }
                .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${statusEmoji} Backup ${isSuccess ? 'Completed Successfully' : 'Failed'}</h1>
                <p>Orthodox Metrics Backup System</p>
            </div>
            <div class="content">
                <div class="detail-card">
                    <h3>Backup Details</h3>
                    <p><strong>Job ID:</strong> #${jobId}</p>
                    <p><strong>Type:</strong> ${kindLabel}</p>
                    <p><strong>Status:</strong> ${isSuccess ? 'Success' : 'Failed'}</p>
                    <p><strong>Duration:</strong> ${durationStr}</p>
                    <p><strong>Completed:</strong> ${new Date().toLocaleString()}</p>
                    ${jobError ? `<p><strong>Error:</strong> <span style="color: red;">${jobError}</span></p>` : ''}
                </div>
                ${!isSuccess ? '<p>Please check the backup logs and Job History in Admin Settings for more details.</p>' : '<p>Your data is safely backed up.</p>'}
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Orthodox Metrics System</p>
            </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Backup notification sent to ${notificationEmail} for job #${jobId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send backup notification email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send Contact Us form email to info@orthodoxmetrics.com
const sendContactEmail = async ({ firstName, lastName, phone, email, enquiryType, message }) => {
  try {
    const transporter = await createTransporter();
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Metrics';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const enquiryLabels = {
      general: 'General Enquiry',
      parish_registration: 'Parish Registration',
      records: 'Records & Certificates',
      technical: 'Technical Support',
      billing: 'Billing & Pricing',
      other: 'Other',
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #5d87ff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .detail-card { background: #f9f9f9; border-left: 4px solid #5d87ff; padding: 15px; margin: 10px 0; }
        .footer { background: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>New Contact Form Submission</h1>
        <p>Orthodox Metrics Website</p>
    </div>
    <div class="content">
        <div class="detail-card">
            <h3>Contact Details</h3>
            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Enquiry Type:</strong> ${enquiryLabels[enquiryType] || enquiryType}</p>
        </div>
        <div class="detail-card">
            <h3>Message</h3>
            <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
        <p><em>Submitted on ${new Date().toLocaleString()}</em></p>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Orthodox Metrics</p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: 'info@orthodoxmetrics.com',
      replyTo: email,
      subject: `Contact Form: ${enquiryLabels[enquiryType] || enquiryType} from ${firstName} ${lastName}`,
      html: htmlContent,
      text: `New contact form submission\n\nName: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone}\nEnquiry: ${enquiryLabels[enquiryType] || enquiryType}\n\nMessage:\n${message}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Contact form email sent:', { messageId: info.messageId, from: email });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send contact form email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send password reset email with temporary password
const sendPasswordResetEmail = async (toEmail, tempPassword, firstName) => {
  try {
    const transporter = await createTransporter();
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Metrics';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const displayName = firstName || 'User';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .header { background: linear-gradient(135deg, #5d87ff 0%, #8c249d 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; }
        .content { padding: 30px; }
        .password-box { background: #f0f4ff; border: 2px solid #5d87ff; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0; }
        .password-box .temp-password { font-size: 28px; font-weight: bold; color: #5d87ff; letter-spacing: 2px; font-family: monospace; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Password Reset</h1>
        <p>Orthodox Metrics</p>
    </div>
    <div class="content">
        <p>Hello ${displayName},</p>
        <p>We received a request to reset your password. A temporary password has been generated for your account.</p>
        
        <div class="password-box">
            <p style="margin: 0 0 10px 0; color: #555;">Your Temporary Password</p>
            <div class="temp-password">${tempPassword}</div>
        </div>
        
        <div class="warning">
            <strong>Important:</strong> You will be required to change this password immediately after logging in. 
            This temporary password should not be shared with anyone.
        </div>
        
        <h3>Next Steps:</h3>
        <ol>
            <li>Go to <a href="https://orthodoxmetrics.com/auth/login2">orthodoxmetrics.com/auth/login2</a></li>
            <li>Log in with your email and the temporary password above</li>
            <li>You will be prompted to create a new password</li>
        </ol>
        
        <p>If you did not request this password reset, please contact your administrator immediately.</p>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Orthodox Metrics &mdash; Digital Church Metrics</p>
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject: 'Password Reset - Orthodox Metrics',
      html: htmlContent,
      text: `Hello ${displayName},\n\nYour temporary password is: ${tempPassword}\n\nPlease log in at https://orthodoxmetrics.com/auth/login2 and change your password immediately.\n\nIf you did not request this, contact your administrator.\n\n- Orthodox Metrics`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${toEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send password reset email to ${toEmail}:`, error.message);
    throw error;
  }
};

// Send invite email to a new user
const sendInviteEmail = async (toEmail, inviteUrl, role, accountExpiresAt) => {
  try {
    const transporter = await createTransporter();
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Metrics';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const expiresDate = new Date(accountExpiresAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .header { background: linear-gradient(135deg, #5d87ff 0%, #8c249d 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; }
        .content { padding: 30px; }
        .invite-box { background: #f0f4ff; border: 2px solid #5d87ff; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0; }
        .button { display: inline-block; background: #5d87ff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; }
        .detail { background: #f9f9f9; border-left: 4px solid #8c249d; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>You're Invited!</h1>
        <p>Orthodox Metrics</p>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>You've been invited to join Orthodox Metrics as a <strong>${roleLabel}</strong>.</p>

        <div class="detail">
            <p><strong>Role:</strong> ${roleLabel}</p>
            <p><strong>Account valid until:</strong> ${expiresDate}</p>
        </div>

        <div class="invite-box">
            <p style="margin: 0 0 15px 0; color: #555;">Click below to set up your account:</p>
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
        </div>

        <p><strong>Direct link:</strong> <a href="${inviteUrl}">${inviteUrl}</a></p>

        <p style="color: #888; font-size: 14px;">This invite link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.</p>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Orthodox Metrics &mdash; Digital Church Metrics</p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject: `You're invited to Orthodox Metrics as ${roleLabel}`,
      html: htmlContent,
      text: `You've been invited to join Orthodox Metrics as a ${roleLabel}.\n\nAccept your invitation: ${inviteUrl}\n\nThis link expires in 7 days. Your account will be valid until ${expiresDate}.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Invite email sent to ${toEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send invite email to ${toEmail}:`, error.message);
    throw error;
  }
};

// Send email verification link
const sendVerificationEmail = async (toEmail, verificationUrl, firstName) => {
  try {
    const transporter = await createTransporter();
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Metrics';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const displayName = firstName || 'User';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .header { background: linear-gradient(135deg, #5d87ff 0%, #8c249d 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; }
        .content { padding: 30px; }
        .verify-box { background: #f0f4ff; border: 2px solid #5d87ff; border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0; }
        .button { display: inline-block; background: #5d87ff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; }
        .info { background: #e8f4f8; border-left: 4px solid #5d87ff; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Verify Your Email</h1>
        <p>Orthodox Metrics</p>
    </div>
    <div class="content">
        <p>Hello ${displayName},</p>
        <p>Please verify your email address to ensure the security of your account and enable all platform features.</p>

        <div class="verify-box">
            <p style="margin: 0 0 15px 0; color: #555;">Click the button below to verify your email:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>

        <p><strong>Direct link:</strong> <a href="${verificationUrl}">${verificationUrl}</a></p>

        <div class="info">
            <p style="margin: 0;"><strong>Why verify?</strong> Email verification confirms that you have access to this email address, protects your account from unauthorized access, and enables important notifications like password resets and security alerts.</p>
        </div>

        <p style="color: #888; font-size: 14px;">This verification link expires in 24 hours. If you did not create an account on Orthodox Metrics, you can safely ignore this email.</p>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Orthodox Metrics &mdash; Digital Church Metrics</p>
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject: 'Verify Your Email - Orthodox Metrics',
      html: htmlContent,
      text: `Hello ${displayName},\n\nPlease verify your email address by visiting the link below:\n\n${verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create this account, you can safely ignore this email.\n\n- Orthodox Metrics`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${toEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${toEmail}:`, error.message);
    throw error;
  }
};

// Send interactive report invite to a recipient
const sendRecipientInvite = async ({ to, reportTitle, link, expiresAt, churchName }) => {
  try {
    const transporter = await createTransporter();
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Metrics';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const church = churchName || 'your parish';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .header { background: linear-gradient(135deg, #5d87ff 0%, #8c249d 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; }
        .content { padding: 30px; }
        .info-box { background: #f0f4ff; border: 2px solid #5d87ff; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0; }
        .button { display: inline-block; background: #5d87ff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; }
        .detail { background: #f9f9f9; border-left: 4px solid #8c249d; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Interactive Report Request</h1>
        <p>Orthodox Metrics</p>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>A priest from <strong>${church}</strong> has requested your help completing church records.</p>

        <div class="detail">
            <p><strong>Report:</strong> ${reportTitle}</p>
            <p><strong>Expires:</strong> ${expiresDate}</p>
        </div>

        <p>Please click the link below to review and fill in the requested information. No account is required.</p>

        <div class="info-box">
            <p style="margin: 0 0 15px 0; color: #555;">Open your interactive report:</p>
            <a href="${link}" class="button">Open Report</a>
        </div>

        <p><strong>Direct link:</strong> <a href="${link}">${link}</a></p>

        <p style="color: #888; font-size: 14px;">This link expires on ${expiresDate}. If you did not expect this email, you can safely ignore it.</p>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Orthodox Metrics &mdash; Digital Church Metrics</p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject: `Record information requested: ${reportTitle}`,
      html: htmlContent,
      text: `Hello,\n\nA priest from ${church} has requested your help completing church records.\n\nReport: ${reportTitle}\nExpires: ${expiresDate}\n\nOpen your report: ${link}\n\nNo account is required. If you did not expect this email, you can safely ignore it.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Interactive report invite sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send interactive report invite to ${to}:`, error.message);
    throw error;
  }
};

// Notify priest when a recipient submits their interactive report patches
const sendPriestSummary = async ({ to, reportTitle, submittedBy, patchCount, churchName }) => {
  try {
    const transporter = await createTransporter();
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Metrics';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .header { background: linear-gradient(135deg, #2e7d32 0%, #1565c0 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; }
        .content { padding: 30px; }
        .detail { background: #f9f9f9; border-left: 4px solid #2e7d32; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Report Submission Received</h1>
        <p>Orthodox Metrics</p>
    </div>
    <div class="content">
        <p>Hello,</p>
        <p>A recipient has submitted their responses for an interactive report.</p>

        <div class="detail">
            <p><strong>Report:</strong> ${reportTitle}</p>
            <p><strong>Submitted by:</strong> ${submittedBy}</p>
            <p><strong>Patches to review:</strong> ${patchCount}</p>
        </div>

        <p>Log in to Orthodox Metrics to review and accept or reject the submitted changes.</p>
    </div>
    <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Orthodox Metrics &mdash; Digital Church Metrics</p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject: `Report submission: ${reportTitle} — ${patchCount} patch(es) to review`,
      html: htmlContent,
      text: `Hello,\n\nA recipient has submitted their responses for an interactive report.\n\nReport: ${reportTitle}\nSubmitted by: ${submittedBy}\nPatches to review: ${patchCount}\n\nLog in to Orthodox Metrics to review and accept or reject the submitted changes.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Priest summary email sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send priest summary email to ${to}:`, error.message);
    throw error;
  }
};

// ────────────────────────────────────────────────────────────────────────
// Enrollment form (public homepage "Enroll Now" / "Sign Up Today" CTA)
// Mirrors sendContactEmail but with a slimmer field set and a hard-coded
// destination address for the founder while pre-launch.
// ────────────────────────────────────────────────────────────────────────
const ENROLLMENT_RECIPIENT = process.env.ENROLLMENT_EMAIL || 'info@orthodoxmetrics.com';

const sendEnrollmentEmail = async ({ parishName, contactName, email, phone }) => {
  try {
    const transporter = await createTransporter();
    const dbConfig = await getActiveEmailConfig();
    const senderName = dbConfig?.sender_name || 'Orthodox Metrics';
    const senderEmail = dbConfig?.sender_email || process.env.SMTP_USER || process.env.EMAIL_USER;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #2d1b4e; color: #d4af37; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 6px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; }
    .content { padding: 24px; }
    .detail-card { background: #f9f9f9; border-left: 4px solid #d4af37; padding: 16px; margin: 12px 0; }
    .detail-card h3 { margin: 0 0 8px; color: #2d1b4e; font-size: 15px; }
    .detail-card p { margin: 4px 0; font-size: 14px; }
    .footer { background: #f1f1f1; padding: 12px; text-align: center; font-size: 11px; color: #777; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Parish Enrollment Inquiry</h1>
    <p>Submitted via orthodoxmetrics.com homepage</p>
  </div>
  <div class="content">
    <div class="detail-card">
      <h3>Parish</h3>
      <p><strong>${parishName}</strong></p>
    </div>
    <div class="detail-card">
      <h3>Contact</h3>
      <p><strong>Name:</strong> ${contactName}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> ${phone || '(not provided)'}</p>
    </div>
    <p style="font-size: 12px; color: #888;"><em>Submitted ${new Date().toLocaleString()}</em></p>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Orthodox Metrics</p>
  </div>
</body>
</html>
    `;

    const text = [
      'New Parish Enrollment Inquiry',
      '',
      `Parish: ${parishName}`,
      `Contact: ${contactName}`,
      `Email: ${email}`,
      `Phone: ${phone || '(not provided)'}`,
      '',
      `Submitted ${new Date().toISOString()}`,
    ].join('\n');

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: ENROLLMENT_RECIPIENT,
      replyTo: email,
      subject: `Enroll Now: ${parishName} (${contactName})`,
      html: htmlContent,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Enrollment email sent:', { messageId: info.messageId, parish: parishName, contact: email });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send enrollment email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOCRReceipt,
  sendSessionVerification,
  sendErrorNotification,
  testEmailConfig,
  sendTaskAssignmentEmail,
  sendTaskSubmissionEmail,
  sendTaskCreationEmail,
  sendBackupNotification,
  sendContactEmail,
  sendEnrollmentEmail,
  sendPasswordResetEmail,
  sendInviteEmail,
  sendVerificationEmail,
  sendRecipientInvite,
  sendPriestSummary
};
