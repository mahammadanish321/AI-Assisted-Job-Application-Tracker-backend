import { gmail as google_gmail, auth as google_auth } from '@googleapis/gmail';
import { Application } from '../models/Application';
import { Notification } from '../models/Notification';

class GmailService {
  /**
   * Scans the user's Gmail using the provided OAuth access token for updates 
   * from tracked companies in their Soon board.
   */
  async syncJobUpdates(userId: string, accessToken: string) {
    try {
      const auth = new google_auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const gmail = google_gmail({ version: 'v1', auth });

      // 1. Get tracked companies from user's active applications
      // Only include valid string companies
      const applications = await Application.find({ user: userId as any });
      
      const trackedCompanies = [...new Set(
        applications
          .map(app => app.company?.trim())
          .filter(company => company && company.length > 2)
      )];

      if (trackedCompanies.length === 0) {
        return { message: 'No tracked companies found to scan.', count: 0 };
      }

      // 34-39: Prepare a Gmail search query for these companies.
      const fromQueries = trackedCompanies.map(c => {
        // Broad match for the company name in 'from' field
        const cleanName = c.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase(); 
        const firstWord = cleanName.split(' ')[0];
        return `from:${firstWord}`;
      });
      
      const queryString = `is:unread {${fromQueries.join(' ')}}`;
      console.log(`[GmailSync] Query: "${queryString}" for user ${userId}`);

      // 2. Fetch unread messages matching the query
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: queryString,
        maxResults: 50, // Limit to recent 50
      });

      const messages = response.data.messages || [];
      if (messages.length === 0) {
        return { message: 'No relevant emails found.', count: 0 };
      }

      let newNotificationsCount = 0;
      const targetKeywords = [
        'interview', 'status', 'assessment', 'offer', 'next steps', 
        'update', 'rejection', 'unfortunately', 'congratulations',
        'application', 'scheduling', 'test', 'assignment'
      ];

      // 3. Process each message
      for (const msg of messages) {
        if (!msg.id) continue;

        // Check if we already notified about this exact email
        const existingNotification = await Notification.findOne({
          user: userId,
          'metadata.messageId': msg.id
        });

        if (existingNotification) continue;

        // Fetch snippets/details
        const msgDetails = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata', // metadata has the snippet and headers
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const snippet = msgDetails.data.snippet || '';
        const headers = msgDetails.data.payload?.headers || [];
        const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
        const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');

        const subject = subjectHeader?.value || 'No Subject';
        const from = fromHeader?.value || 'Unknown Sender';

        // Check for high-priority keywords in snippet or subject
        const combinedText = `${subject} ${snippet}`.toLowerCase();
        const hasKeyword = targetKeywords.some(kw => combinedText.includes(kw));

        // Attempt to extract the company name that matched
        const matchedCompany = trackedCompanies.find(c => {
           const cleanName = c.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); 
           return from.toLowerCase().includes(cleanName);
        }) || from?.split('<')[0]?.trim() || 'a tracked company';

        if (hasKeyword) {
          // Create Notification
          await Notification.create({
            user: userId,
            type: 'EMAIL_UPDATE',
            message: `New Update from ${matchedCompany}: ${subject} - "${snippet.substring(0, 80)}..."`,
            link: '/dashboard', 
            metadata: {
              messageId: msg.id,
              from: from
            }
          });
          newNotificationsCount++;
        }
      }

      return { message: 'Sync complete', count: newNotificationsCount };
    } catch (error: any) {
      console.error('Gmail Sync Error:', error);
      throw new Error(`Failed to sync Gmail: ${error.message}`);
    }
  }
}

export default new GmailService();
