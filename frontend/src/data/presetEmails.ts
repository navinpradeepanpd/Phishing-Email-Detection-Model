export interface PresetEmail {
  id: string;
  title: string;
  type: 'phishing' | 'safe';
  category: string;
  sender: string;
  subject: string;
  body: string;
}

export const PRESET_EMAILS: PresetEmail[] = [
  {
    id: 'phish-m365',
    title: 'Urgent Microsoft 365 Password Expiry',
    type: 'phishing',
    category: 'Credential Harvesting',
    sender: 'IT-Helpdesk <no-reply@micros0ft-security-auth.net>',
    subject: 'URGENT: Your Office 365 Password Expires in 2 Hours',
    body: `From: IT-Helpdesk <no-reply@micros0ft-security-auth.net>
Reply-To: support@login-portal-verifier.tk
Subject: URGENT: Your Office 365 Password Expires in 2 Hours

Dear Employee,

Your Microsoft 365 Enterprise account password is scheduled to EXPIRE TODAY immediately.
If you do not verify your login credentials, your email mailbox and access privileges will be SUSPENDED.

Please click the secure link below to keep your active password:
http://192.168.1.105/auth/login?user=account_verify

Failure to verify within 2 hours will lead to account termination.

Regards,
IT Global Security Operations`,
  },
  {
    id: 'phish-paypal',
    title: 'PayPal Unauthorized $850 Wire',
    type: 'phishing',
    category: 'Financial Panic',
    sender: 'PayPal Fraud Team <service@intl-paypa1.top>',
    subject: 'Security Alert: Unauthorized transaction of $850.00 USD detected',
    body: `From: PayPal Security <service@intl-paypa1.top>
Subject: Security Alert: Unauthorized transaction of $850.00 USD detected

We detected an unusual payment of $850.00 USD to CryptoWorld Ltd from an unrecognized IP address.
If you did not authorize this payment, you must verify your identity immediately to claim a full refund.

Verify your account now:
http://bit.ly/paypal-dispute-resolution-case993

Failure to respond immediately will result in your funds being permanently locked.

Sincerely,
PayPal Fraud Prevention Team`,
  },
  {
    id: 'phish-lottery',
    title: 'International Prize Bonus Claim',
    type: 'phishing',
    category: 'Prize / Lottery',
    sender: 'Mega Millions Notification <winner@claim-prize-global.club>',
    subject: 'CONGRATULATIONS: You have been selected to win $2,500,000 USD',
    body: `Subject: CONGRATULATIONS: You have been selected to win $2,500,000 USD

DEAR WINNER,

YOU HAVE WON AN UNCLAIMED CASH PRIZE OF $2,500,000.00 FROM THE ANNUAL INTERNATIONAL REWARD DRAW!
TO CLAIM YOUR PRIZE MONEY IMMEDIATELY, KINDLY FILL IN YOUR FULL NAME, BANK ACCOUNT DETAILS, AND SSN.

CLICK HERE TO CLAIM: http://tinyurl.com/claim-jackpot-2026

URGENT: YOU MUST RESPOND WITHIN 24 HOURS OR YOUR PRIZE WILL BE FORFEITED.`,
  },
  {
    id: 'safe-jira',
    title: 'Jira Sprint Review Notification',
    type: 'safe',
    category: 'Work Collaboration',
    sender: 'Jira Cloud <jira@atlassian.net>',
    subject: '[PROJ-412] Pull request approved and ready for merge',
    body: `From: Jira Cloud <jira@atlassian.net>
Subject: [PROJ-412] Pull request approved and ready for merge

Hi Team,

Alex Miller just approved pull request #84 for issue PROJ-412: "Refactor telemetry data ingestion pipeline".
All automated integration tests have passed on GitHub Actions.

You can review the full diff and discussion comments on Bitbucket:
https://bitbucket.org/engineering/telemetry-pipeline/pull-requests/84

Let us know if you need any adjustments before the sprint cutoff tomorrow at 5 PM.

Best regards,
The Engineering Workflow Team`,
  },
  {
    id: 'safe-newsletter',
    title: 'Python Weekly Digest Newsletter',
    type: 'safe',
    category: 'Newsletter',
    sender: 'Python Weekly <editor@pythonweekly.com>',
    subject: 'Python Weekly - Issue 620: Modern Async Patterns & Typing in 3.13',
    body: `Welcome to issue 620 of Python Weekly!

In this edition:
- Deep dive into free-threaded Python and subinterpreters in Python 3.13
- Understanding memory allocations with tracemalloc
- Best practices for structuring high-throughput FastAPI microservices

Articles & Tutorials:
Read our curated articles on modern backend engineering at https://realpython.com/async-io-python/
Check out the release notes at https://docs.python.org/3.13/whatsnew/

You received this email because you subscribed to Python Weekly.
To unsubscribe, visit https://pythonweekly.com/unsubscribe`,
  },
];
