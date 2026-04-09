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
      
      const discardWords = ['the', 'inc', 'llc', 'corp', 'corporation', 'company', 'limited', 'ltd', 'a', 'an', 'and'];
      
      const trackedCompanies = [...new Set(
        applications
          .map(app => app.company?.trim())
          .filter(company => company && company.length > 1)
      )];

      if (trackedCompanies.length === 0) {
        return { message: 'No tracked companies found to scan.', count: 0 };
      }

      // Prepare a Gmail search query. 
      // We look for unread emails from the last 30 days that mention the companies.
      // We use the full company name in quotes for exact matching if possible.
      const companyTerms = trackedCompanies.map(c => {
         const words = c.toLowerCase().split(/\s+/).filter(w => !discardWords.includes(w));
         // If we have specific words left, use them, otherwise use the original name
         const searchStr = words.length > 0 ? words[0] : c;
         return `"${searchStr}"`;
      });
      
      // Gmail query limits apply, so we chunk or limit if too many
      const limitedTerms = companyTerms.slice(0, 20); 
      const queryString = `is:unread after:30d {${limitedTerms.join(' ')}}`;
      
      console.log(`[GmailSync] Querying Gmail for user ${userId}: ${queryString}`);

      // 2. Fetch unread messages matching the query
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: queryString,
        maxResults: 25, // Recent 25 is safer for performance
      });

      const messages = response.data.messages || [];
      if (messages.length === 0) {
        return { message: 'No relevant emails found.', count: 0 };
      }

      let newNotificationsCount = 0;
      const targetKeywords = [
        'interview', 'status', 'assessment', 'offer', 'next steps', 
        'update', 'rejection', 'unfortunately', 'congratulations',
        'application', 'scheduling', 'test', 'assignment', 'hiring',
        'recruiter', 'portal', 'feedback'
      ];

      // 3. Process each message using parallel fetching for performance
      const syncTasks = messages.map(async (msg) => {
        if (!msg.id) return;

        // Check cache/db
        const existingNotification = await Notification.findOne({
          user: userId,
          'metadata.messageId': msg.id
        });
        if (existingNotification) return;

        // Fetch meta
        const msgDetails = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const snippet = msgDetails.data.snippet || '';
        const headers = msgDetails.data.payload?.headers || [];
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown Sender';

        const combinedText = `${subject} ${snippet}`.toLowerCase();
        const hasKeyword = targetKeywords.some(kw => combinedText.includes(kw));

        if (hasKeyword) {
          const matchedCompany = trackedCompanies.find(c => {
             const cleanName = c.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); 
             return from.toLowerCase().includes(cleanName);
          }) || from?.split('<')[0]?.trim() || 'a tracked company';

          await Notification.create({
            user: userId,
            type: 'EMAIL_UPDATE',
            message: `New Update from ${matchedCompany}: ${subject} - "${snippet.substring(0, 80)}..."`,
            link: '/dashboard', 
            metadata: { messageId: msg.id, from }
          });
          return true;
        }
        return false;
      });

      const results = await Promise.all(syncTasks);
      newNotificationsCount = results.filter(r => r === true).length;

      return { message: 'Sync complete', count: newNotificationsCount };
    } catch (error: any) {
      console.error('Gmail Sync Error:', error);
      throw new Error(`Failed to sync Gmail: ${error.message}`);
    }
  }
}

export default new GmailService();
