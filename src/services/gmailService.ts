import { google } from 'googleapis';
import { Application } from '../models/Application.js';
import { Notification } from '../models/Notification.js';

class GmailService {
  /**
   * Scans the user's Gmail using the provided OAuth access token for updates 
   * from tracked companies in their Soon board.
   */
  async syncJobUpdates(userId: string, accessToken: string) {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const gmail = google.gmail({ version: 'v1', auth });

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

      // Prepare a Gmail search query for these companies.
      // E.g. "is:unread {from:mockaisolutions from:google from:microsoft}"
      // To simplify matching, we take the first word or clean string of the company
      const fromQueries = trackedCompanies.map(c => {
        // Remove spaces and special chars, take first distinct chunk for broader match
        const cleanName = c.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); 
        return `from:${cleanName}`;
      });
      
      const queryString = `is:unread {${fromQueries.join(' ')}}`;

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
      const targetKeywords = ['interview', 'status', 'assessment', 'offer', 'next steps', 'update'];

      // Get all existing notification message IDs in a single query for faster lookup
      const existingMessageIds = new Set(
        (await Notification.find({
          user: userId,
          'metadata.messageId': { $in: messages.map(m => m.id) }
        }).select('metadata.messageId'))
          .map(n => n.metadata?.messageId)
      );

      // 3. Process messages in parallel batches (max 10 concurrent requests to avoid rate limits)
      const batchSize = 10;
      const messagesToProcess = messages.filter(msg => msg.id && !existingMessageIds.has(msg.id));

      for (let i = 0; i < messagesToProcess.length; i += batchSize) {
        const batch = messagesToProcess.slice(i, i + batchSize);

        // Fetch all message details in parallel
        const detailPromises = batch.map(msg =>
          gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date']
          }).catch(err => {
            console.warn(`Failed to fetch message ${msg.id}:`, err.message);
            return null;
          })
        );

        const msgDetails = await Promise.all(detailPromises);

        // Process fetched messages and collect notifications to create
        const notificationsToCreate = [];

        for (let j = 0; j < batch.length; j++) {
          const msg = batch[j];
          const msgDetail = msgDetails[j];

          if (!msgDetail || !msg.id) continue;

          const snippet = msgDetail.data.snippet || '';
          const headers = msgDetail.data.payload?.headers || [];
          const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
          const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');

          const subject = subjectHeader?.value || 'No Subject';
          const from = fromHeader?.value || 'Unknown Sender';

          // Check for high-priority keywords
          const combinedText = `${subject} ${snippet}`.toLowerCase();
          const hasKeyword = targetKeywords.some(kw => combinedText.includes(kw));

          if (hasKeyword) {
            // Extract company name
            const matchedCompany = trackedCompanies.find(c => {
              const cleanName = c.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
              return from.toLowerCase().includes(cleanName);
            }) || from?.split('<')[0]?.trim() || 'a tracked company';

            notificationsToCreate.push({
              user: userId,
              type: 'EMAIL_UPDATE',
              message: `New Update from ${matchedCompany}: ${subject} - "${snippet.substring(0, 80)}..."`,
              link: '/dashboard',
              metadata: {
                messageId: msg.id,
                from: from
              }
            });
          }
        }

        // Batch create all notifications at once instead of one by one
        if (notificationsToCreate.length > 0) {
          await Notification.insertMany(notificationsToCreate);
          newNotificationsCount += notificationsToCreate.length;
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
