/**
 * Markpad - Google Forms Generator Script
 * 
 * HOW TO USE THIS SCRIPT:
 * 1. Open your browser and visit: https://script.new (Google Apps Script).
 * 2. Delete any code in the editor, copy and paste this entire script.
 * 3. Click the "Save" (disk icon) button, then click "Run" (play icon) at the top.
 * 4. Google will ask for permission once ("Review permissions" -> Choose your Google Account -> "Advanced" -> "Go to Untitled project (unsafe)" -> "Allow").
 * 5. In 5 seconds, check the "Execution log" at the bottom:
 *    - It will output your Form Edit URL (to customize colors/headers).
 *    - It will output your Public URL (the link to give to your customers!).
 *    The form is also automatically saved directly in your Google Drive!
 */

function createMarkpadFeedbackForm() {
  var form = FormApp.create('Markpad - Customer Feedback & Experience Survey');
  
  form.setDescription(
    'Thank you for using Markpad! Your opinions, feedback, and ratings help us make Markpad the fastest, cleanest, and most versatile native text and document utility. This survey takes about 2 minutes to complete.'
  );
  form.setConfirmationMessage(
    'Thank you for sharing your feedback! Your thoughts and ratings directly shape the future of Markpad.'
  );
  form.setAllowResponseEdits(true);
  form.setShowLinkToRespondAgain(true);

  // ─── Section 1: Overall Satisfaction & Net Promoter Score ───
  var ratingItem = form.addScaleItem();
  ratingItem.setTitle('1. Overall, how would you rate your experience with Markpad?')
    .setBounds(1, 5)
    .setLabels('1 - Poor', '5 - Outstanding')
    .setRequired(true);

  var npsItem = form.addScaleItem();
  npsItem.setTitle('2. How likely are you to recommend Markpad to a friend or colleague?')
    .setBounds(0, 10)
    .setLabels('0 - Not likely at all', '10 - Extremely likely')
    .setRequired(true);

  // ─── Section 2: Usage & Persona ───
  var pageUsage = form.addPageBreakItem();
  pageUsage.setTitle('Your Setup & Usage Habits')
    .setHelpText('Help us understand how and where you use Markpad.');

  var osItem = form.addCheckboxItem();
  osItem.setTitle('3. What operating system(s) do you use Markpad on?')
    .setChoiceValues([
      'Windows 11',
      'Windows 10',
      'Windows 7 / 8',
      'Web Version (Browser)',
      'macOS',
      'Linux'
    ])
    .showOtherOption(true)
    .setRequired(true);

  var fileTypesItem = form.addCheckboxItem();
  fileTypesItem.setTitle('4. What file formats do you open or edit most often in Markpad?')
    .setChoiceValues([
      'Plain Text (.txt, .log)',
      'Markdown (.md, .markdown)',
      'Data Tables (.csv, .tsv)',
      'Config & Data (.json, .yaml, .toml, .env, .ini)',
      'Office Documents (.docx, .doc, .xlsx, .xls)',
      'PDF Documents (.pdf)',
      'Source Code (.js, .ts, .py, .rs, .html, .css, .sql)'
    ])
    .showOtherOption(true)
    .setRequired(true);

  var previousEditorItem = form.addMultipleChoiceItem();
  previousEditorItem.setTitle('5. What text editor did you primarily use before Markpad?')
    .setChoiceValues([
      'Windows Notepad',
      'Notepad++',
      'VS Code',
      'Sublime Text',
      'Obsidian',
      'WordPad / Microsoft Word'
    ])
    .showOtherOption(true)
    .setRequired(false);

  // ─── Section 3: Feature Performance Ratings ───
  var pageFeatures = form.addPageBreakItem();
  pageFeatures.setTitle('Feature & Performance Ratings')
    .setHelpText('Rate specific aspects of Markpad from 1 (Poor) to 5 (Excellent).');

  var gridItem = form.addGridItem();
  gridItem.setTitle('6. Please rate the following aspects of Markpad:')
    .setRows([
      'Startup speed & launch responsiveness',
      'Editor speed with large files',
      'User interface & Dark/Light themes',
      'Multi-format support (DOCX, XLSX, PDF, CSV, JSON)',
      'Tab & Multi-window management',
      'File saving reliability & safety'
    ])
    .setColumns(['1 - Poor', '2 - Fair', '3 - Good', '4 - Great', '5 - Excellent'])
    .setRequired(true);

  // ─── Section 4: Detailed Opinions & Feedback ───
  var pageFeedback = form.addPageBreakItem();
  pageFeedback.setTitle('Opinions & Feature Requests')
    .setHelpText('Tell us what you love and what we can improve.');

  var favoriteItem = form.addParagraphTextItem();
  favoriteItem.setTitle('7. What do you like most about Markpad?')
    .setHelpText('E.g., fast startup, universal format viewer, clean design, etc.')
    .setRequired(false);

  var painPointsItem = form.addParagraphTextItem();
  painPointsItem.setTitle('8. What is the most frustrating part or bug you experienced?')
    .setHelpText('Please share any issues, confusing UI elements, or workflow friction.')
    .setRequired(false);

  var featureRequestItem = form.addParagraphTextItem();
  featureRequestItem.setTitle('9. What features or improvements would you like to see added next?')
    .setHelpText('E.g., split view, syntax themes, line bookmarking, plugins, etc.')
    .setRequired(false);

  // ─── Section 5: Optional Follow-up ───
  var pageContact = form.addPageBreakItem();
  pageContact.setTitle('Stay in Touch (Optional)');

  var emailItem = form.addTextItem();
  emailItem.setTitle('10. Email address (Optional)')
    .setHelpText('If you would like us to follow up on your feedback or notify you of fixes.');

  var betaItem = form.addMultipleChoiceItem();
  betaItem.setTitle('11. Would you be interested in beta-testing future Markpad releases?')
    .setChoiceValues([
      'Yes, invite me to early beta builds!',
      'Maybe later',
      'No, thank you'
    ])
    .setRequired(false);

  Logger.log('\n=============================================');
  Logger.log('🎉 MARKPAD GOOGLE FORM CREATED SUCCESSFULLY!');
  Logger.log('=============================================');
  Logger.log('✏️ Edit URL (To customize themes/view results):\n' + form.getEditUrl());
  Logger.log('🔗 Public URL (Share with customers):\n' + form.getPublishedUrl());
  Logger.log('=============================================\n');
}
