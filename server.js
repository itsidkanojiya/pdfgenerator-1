const express = require("express");
const pdf = require("html-pdf-node");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());


app.get('/check',(req,res)=>{
  res.send({
    messsage:"Success online"
  })
})
// Route to generate PAPER PDF
app.post("/generate-pdf", async (req, res) => {
  const { headerDetails, questionsList, showAnswers } = req.body;

  // Check if headerDetails is undefined
  if (!headerDetails) {
    return res.status(400).json({ error: "Header details are missing" });
  }

  // Ensure the logo exists
  if (!headerDetails.logo) {
    return res.status(400).json({ error: "Logo is missing in header details" });
  }

  // Function to convert index to alphabet (A, B, C, ...)
  const getAlphabetTitle = (index) => String.fromCharCode(65 + index);

  const sub = headerDetails.subject;

  let paperDetails = {
    mcqs: "",
    blanks: "",
    truefalse: "",
    twoliner: "",
    short: "",
    long: "",
  };

  function getPaperDetails(sub) {
    if (sub === "Gujarati") {
      paperDetails = {
        mcqs: "નીચે આપેલા વિકલ્પોમાંથી યોગ્ય વિકલ્પ પસંદ કરી (✓) ની નિશાની કરો.",
        blanks: "યોગ્ય શબ્દ પસંદ કરી ખાલી જગ્યા પૂરો.",
        truefalse:
          "ખરાં વાક્ય સામે ખરાં  ✓ અને ખોટાં વાક્ય સામે ખોટાં × ની નિશાની કરો.",
        twoliner: "નીચે આપેલા પ્રશ્નોના બે ત્રણ વાક્યમાં જવાબ લખો.",
        short: "નીચે આપેલા પ્રશ્નોના જવાબ ટૂંકમાં લખો.",
        long: "નીચે આપેલા પ્રશ્નોના જવાબ વિસ્તારપૂર્વક લખો.",
      };
    } else if (sub === "Hindi") {
      paperDetails = {
        mcqs: "बहुविकल्पीय प्रश्न (MCQs)। सही विकल्पों पर टिक कीजिए।",
        blanks: "प्रत्येक वाक्य में रिक्त स्थानों को एक उपयुक्त शब्द से भरें।",
        truefalse: "सत्य के लिए (T) और असत्य के लिए (F) लिखें।",
        twoliner: "निम्नलिखित प्रश्नों के उत्तर एक या दो वाक्यों में दीजिए।",
        short: "लघु उत्तरीय प्रश्न।",
        long: "दीर्घ उत्तरीय प्रश्न",
      };
    } else {
      paperDetails = {
        mcqs: "Multiple Choice Questions (MCQs). Tick (✓) the correct options.",
        blanks: "Fill in the blanks in each sentence with an appropriate word",
        truefalse: "Write (T) for True and (F) for False.",
        twoliner: "Answer the following questions in one or two sentences.",
        short: "Short Answer Questions.",
        long: "Long Answer Questions",
      };
    }

    return paperDetails;
  }
  getPaperDetails(sub);
  const calculateTotalMarks = (questionsList) => {
    const getSectionTotal = (section) =>
      section?.questions.reduce((total, q) => total + q.marks, 0) || 0;
  
    const totalMarks = 
      getSectionTotal(questionsList.mcq) +
      getSectionTotal(questionsList.blanks) +
      getSectionTotal(questionsList.truefalse) +
      getSectionTotal(questionsList.twoLineQuestions) +
      getSectionTotal(questionsList.shortQuestions) +
      getSectionTotal(questionsList.longQuestions);
  
    return totalMarks;
  };
  headerDetails.total_marks = calculateTotalMarks(questionsList);
  // CSS Styles as a string (to be included directly in the HTML)
  const styles = `
  body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 20px;
    border-bottom: 1px solid #333;
    padding-bottom: 10px;
    margin-bottom: 10px;
  }

  .school-name {
    font-size: 25px;
    font-weight: bold;
    font-family: Serif;
  }

  .address {
    font-size: 16px;
    color: #888;
  }

  .exam-header {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    font-family: Serif;
    font-weight: 600;
    margin-bottom: 10px;
  }

  .section {
    margin-top: 30px;
  }

  .question-type {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 15px;
    padding-top: 20px;
    font-weight: 600;
    font-size: 16px;
  }

  .question {
    margin-left: 20px;
    margin-bottom: 20px;
    font-weight: 400;
    font-size: 15px;
  }

  .answer {
    margin-top: 5px;
    margin-left: 20px;
    color: #006400;
    font-style: italic;
    font-size: 14px;
  }

  .checkbox {
    height: 12px;
    width: 12px;
    margin-right: 5px;
  }

  .mcq-options {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-top: 8px;
    margin-left: 25px;
  }

  .mcq-options div {
    display: flex;
    align-items: center;
    font-size: 14px;
  }

  .tfbox {
    width: 25px;
    margin-left: 10px;
  }
`;


  // Generate HTML content
  let htmlContent = `
  <html>
  <head>
  <style>${styles}</style>
  </head>
  <body>
  <div class="header">
    <div><img src="${headerDetails.logo}" alt="School Logo" height="80" /></div>
    <div style="text-align: center;">
      <div class="school-name">${
        headerDetails.school_name || "School Name"
      }</div>
      <div class="address">${headerDetails.address || "School Address"}</div>
    </div>
  </div>
  <div class="exam-header">
    <div class="left">STD: ${headerDetails.std || "Standard"}</div>
    <div class="center">SUBJECT: ${headerDetails.subject || "Subject"}</div>
    <div class="right">TOTAL MARKS: ${
      headerDetails.total_marks || "Total Marks"
    }</div>
  </div>
    <div class="exam-header">
    <div class="left">DAY: ${headerDetails.day || "Day"}</div>
    <div class="center">DATE: ${headerDetails.date || "Date"}</div>
    <div class="right">TIME: ${headerDetails.timing || "Time"}</div>
  </div>
  </body>
  </html>
  `;

  // Function for MCQs
  const renderMCQSection = (questionsList, showAnswers, index) => {
    const totalMcqMarks =
      questionsList.mcq?.questions.reduce((total, q) => total + q.marks, 0) ||
      0;

    return questionsList.mcq
      ? `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.mcqs}</div>
        <div>( ${totalMcqMarks} )</div>
      </div>
      ${questionsList.mcq.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          <div class="mcq-options">
            ${question.options
              .map(
                (option) => `
              <div>
                <img class="checkbox" src="/static/images/checkbox.png" />
                <span>${option}</span>
              </div>
            `
              )
              .join("")}
          </div>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `
      : "";
  };

  // Function for Fill in the Blanks
  const renderBlanksSection = (questionsList, showAnswers, index) => {
    const totalBlanksMarks =
      questionsList.blanks?.questions.reduce(
        (total, q) => total + q.marks,
        0
      ) || 0;

    return questionsList.blanks
      ? `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.blanks}</div>
        <div>( ${totalBlanksMarks} )</div>
      </div>
      ${questionsList.blanks.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `
      : "";
  };

  // Function for True/False Questions
  const renderTFSection = (questionsList, showAnswers, index) => {
    const totalTFMarks =
      questionsList.truefalse?.questions.reduce(
        (total, q) => total + q.marks,
        0
      ) || 0;

    return questionsList.truefalse
      ? `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.truefalse}</div>
        <div>( ${totalTFMarks} )</div>
      </div>
      ${questionsList.truefalse.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          <input type="text" class="tfbox" />
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `
      : "";
  };

  // Function for Two Line Questions
  const renderTwoLineSection = (questionsList, showAnswers, index) => {
    const totalTwoLineMarks =
      questionsList.twoLineQuestions?.questions.reduce(
        (total, q) => total + q.marks,
        0
      ) || 0;

    return questionsList.twoLineQuestions
      ? `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.twoliner}</div>
        <div>( ${totalTwoLineMarks} )</div>
      </div>
      ${questionsList.twoLineQuestions.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `
      : "";
  };

  // Function for Short Questions
  const renderShortQuestionSection = (questionsList, showAnswers, index) => {
    const totalShortQueMarks =
      questionsList.shortQuestions?.questions.reduce(
        (total, q) => total + q.marks,
        0
      ) || 0;

    return questionsList.shortQuestions
      ? `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.short}</div>
        <div>( ${totalShortQueMarks} )</div>
      </div>
      ${questionsList.shortQuestions.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `
      : "";
  };

  // Function for Long Questions
  const renderLongQuestionSection = (questionsList, showAnswers, index) => {
    const totalLongQueMarks =
      questionsList.longQuestions?.questions.reduce(
        (total, q) => total + q.marks,
        0
      ) || 0;

    return questionsList.longQuestions
      ? `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.long}</div>
        <div>( ${totalLongQueMarks} )</div>
      </div>
      ${questionsList.longQuestions.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `
      : "";
  };

  // Combine all sections to generate the complete HTML content
  htmlContent += renderMCQSection(questionsList, showAnswers, 0);
  htmlContent += renderBlanksSection(questionsList, showAnswers, 1);
  htmlContent += renderTFSection(questionsList, showAnswers, 2);
  htmlContent += renderTwoLineSection(questionsList, showAnswers, 3);
  htmlContent += renderShortQuestionSection(questionsList, showAnswers, 4);
  htmlContent += renderLongQuestionSection(questionsList, showAnswers, 5);

  // PDF generation options
  const options = {
    format: "A4",
    margin: {
      top: "10mm", // Top margin
      bottom: "10mm", // Bottom margin
      left: "15mm", // Left margin
      right: "15mm", // Right margin
    },
  };

  try {
    // Generate PDF from HTML
    const pdfBuffer = await pdf.generatePdf({ content: htmlContent }, options);
    // res.contentType("application/pdf");
    res.header("Content-Disposition", 'inline; filename="generated_paper.pdf"');
    res.contentType("application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.log(error,'the errort')
    res.status(500).send({ error: "Failed to generate PDF" });
  }
});

// ROUTE TO GENERATE ASSIGNMENT PDF

// app.get("/generate-assignment", async (req, res) => {
//   const { headerDetails, questionsList, showAnswers } = details;

app.post("/generate-assignment", async (req, res) => {
  const { headerDetails, questionsList, showAnswers } = req.body;

  // Check if headerDetails is undefined
  if (!headerDetails) {
    return res.status(400).json({ error: "Header details are missing" });
  }

  // Ensure the logo exists
  if (!headerDetails.logo) {
    return res.status(400).json({ error: "Logo is missing in header details" });
  }

  // Function to convert index to alphabet (A, B, C, ...)
  const getAlphabetTitle = (index) => String.fromCharCode(65 + index);

  const sub = headerDetails.subject;

  let paperDetails = {
    mcqs: "",
    blanks: "",
    truefalse: "",
    twoliner: "",
    short: "",
    long: "",
  };

  function getPaperDetails(sub) {
    if (sub === "Gujarati") {
      paperDetails = {
        mcqs: "નીચે આપેલા વિકલ્પોમાંથી યોગ્ય વિકલ્પ પસંદ કરી (✓) ની નિશાની કરો.",
        blanks: "યોગ્ય શબ્દ પસંદ કરી ખાલી જગ્યા પૂરો.",
        truefalse:
          "ખરાં વાક્ય સામે ખરાં  ✓ અને ખોટાં વાક્ય સામે ખોટાં × ની નિશાની કરો.",
        twoliner: "નીચે આપેલા પ્રશ્નોના બે ત્રણ વાક્યમાં જવાબ લખો.",
        short: "નીચે આપેલા પ્રશ્નોના જવાબ ટૂંકમાં લખો.",
        long: "નીચે આપેલા પ્રશ્નોના જવાબ વિસ્તારપૂર્વક લખો.",
      };
    } else if (sub === "Hindi") {
      paperDetails = {
        mcqs: "बहुविकल्पीय प्रश्न (MCQs)। सही विकल्पों पर टिक कीजिए।",
        blanks: "प्रत्येक वाक्य में रिक्त स्थानों को एक उपयुक्त शब्द से भरें।",
        truefalse: "सत्य के लिए (T) और असत्य के लिए (F) लिखें।",
        twoliner: "निम्नलिखित प्रश्नों के उत्तर एक या दो वाक्यों में दीजिए।",
        short: "लघु उत्तरीय प्रश्न।",
        long: "दीर्घ उत्तरीय प्रश्न",
      };
    } else {
      paperDetails = {
        mcqs: "Multiple Choice Questions (MCQs). Tick (✓) the correct options.",
        blanks: "Fill in the blanks in each sentence with an appropriate word",
        truefalse: "Write (T) for True and (F) for False.",
        twoliner: "Answer the following questions in one or two sentences.",
        short: "Short Answer Questions.",
        long: "Long Answer Questions",
      };
    }

    return paperDetails;
  }
  getPaperDetails(sub);

  // CSS Styles as a string (to be included directly in the HTML)
  const styles = `
   body { font-family: Arial;}
     .header {
        display: flex;
        align-items: center;
        gap: 20px;
        border-bottom: 1px solid #333;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .school-name {
        font-size: 25px;
        font-weight: bold;
        font-family: Serif;
      }
      .address {
        font-size: 16px;
        color: #888;
      }
      .section {
        margin-top: 20px;
      }
      .question-type {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-bottom: 5px;
        padding-top: 20px;
      }
      .question {
        margin-left: 20px;
      }
      .answer {
        margin-top: 5px;
        margin-bottom: 5px;
      }
      .checkbox {
        height: 12px;
        width: 12px;
        margin-right: 5px;
      }
      .exam-header {
        display: grid;
        grid-template-columns: 6fr 2fr;
        width: 100%;
        gap: 10px;
        margin-bottom: 5px;
        font-family: Serif;
        font-weight: 600;
      }
      .left {
        text-align: left;
      }
      .right {
        text-align: left;
      }
      .mcq-options {
        display: flex;
        gap: 10px;
      }
      .tfbox {
        width: 30px;
      }
      .footer{
        padding-top: 20px;
        margin-top: 20px;
      }
  `;

  // Generate HTML content
  let htmlContent = `
<html>
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Lohit+Gujarati&display=swap');

    ${styles} // Add the existing styles here

    /* Define classes for different fonts */
    .eng14 { font-size: 14px; }
    .guj14 { font-family: 'Lohit Gujarati', sans-serif; font-size: 14px; }
    .hin14 { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <div><img src="${headerDetails.logo}" alt="School Logo" height="80" /></div>
    <div style="text-align: center;">
      <div class="school-name ${
        headerDetails.subject === 'Gujarati' ? 'guj14' : headerDetails.subject === 'Hindi' ? 'hin14' : 'eng14'
      }">${headerDetails.school_name || "School Name"}</div>
      <div class="address ${headerDetails.subject === 'Gujarati' ? 'guj14' : 'eng14'}">
        ${headerDetails.address || "School Address"}
      </div>
    </div>
  </div>
  <div class="exam-header">
    <div class="left ${headerDetails.subject === 'Gujarati' ? 'guj14' : 'eng14'}">
      STD: ${headerDetails.std || "Standard"}
    </div>
    <div class="center ${headerDetails.subject === 'Gujarati' ? 'guj14' : 'eng14'}">
      SUBJECT: ${headerDetails.subject || "Subject"}
    </div>
    <div class="right ${headerDetails.subject === 'Gujarati' ? 'guj14' : 'eng14'}">
      TOTAL MARKS: ${headerDetails.total_marks || "Total Marks"}
    </div>
  </div>
</body>
</html>
`;

  // Function for MCQs
  const renderMCQSection = (questionsList, showAnswers, index) => {
    return `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.mcqs}</div>
      </div>
      ${questionsList.mcq.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          <div class="mcq-options">
            ${question.options
              .map(
                (option) => `
              <div>
                <img class="checkbox" src="/static/images/checkbox.png" />
                <span>${option}</span>
              </div>
            `
              )
              .join("")}
          </div>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `;
    ("");
  };

  // Function for Fill in the Blanks
  const renderBlanksSection = (questionsList, showAnswers, index) => {
    return `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.blanks}</div>
      </div>
      ${questionsList.blanks.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `;
    ("");
  };

  // Function for True/False Questions
  const renderTFSection = (questionsList, showAnswers, index) => {
    return `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.truefalse}</div>
      </div>
      ${questionsList.truefalse.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          <input type="text" class="tfbox" />
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
    `;
    ("");
  };

  // Function for Two Line Questions
  const renderTwoLineSection = (questionsList, showAnswers, index) => {
    return `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.twoliner}</div>
      </div>
      ${questionsList.twoLineQuestions.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : "______________________________________________________________________________<br>"
          }
        </div>
      `
        )
        .join("")}
    </div>
    `;
    ("");
  };

  // Function for Short Questions
  const renderShortQuestionSection = (questionsList, showAnswers, index) => {
    return `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.short}</div>
      </div>
      ${questionsList.shortQuestions.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : "______________________________________________________________________________<br>______________________________________________________________________________<br>"
          }
        </div>
      `
        )
        .join("")}
    </div>
    `;
    ("");
  };

  // Function for Long Questions
  const renderLongQuestionSection = (questionsList, showAnswers, index) => {
    return `
    <div class="section">
      <div class="question-type">
        <div>${getAlphabetTitle(index)}) ${paperDetails.long}</div>
      </div>
      ${questionsList.longQuestions.questions
        .map(
          (question, i) => `
        <div class="question">
          <span>${i + 1}) ${question.question}</span>
          ${
            showAnswers
              ? `<div class="answer">Ans: ${question.answer}</div>`
              : "______________________________________________________________________________<br>______________________________________________________________________________<br>______________________________________________________________________________<br>"
          }
        </div>
      `
        )
        .join("")}
    </div>
    `;
    ("");
  };

  const renderFooter = `
  <div class="footer exam-header">
            <div class="left">TEACHER's SIGN:____________</div>
            <div class="right">DATE:____________</div>
          </div>
          `;

  // Combine all sections to generate the complete HTML content
  htmlContent += renderMCQSection(questionsList, showAnswers, 0);
  htmlContent += renderBlanksSection(questionsList, showAnswers, 1);
  htmlContent += renderTFSection(questionsList, showAnswers, 2);
  htmlContent += renderTwoLineSection(questionsList, showAnswers, 3);
  htmlContent += renderShortQuestionSection(questionsList, showAnswers, 4);
  htmlContent += renderLongQuestionSection(questionsList, showAnswers, 5);
  htmlContent += renderFooter;

  // PDF generation options
  const options = {
    format: "A4",
    margin: {
      top: "10mm", // Top margin
      bottom: "10mm", // Bottom margin
      left: "15mm", // Left margin
      right: "15mm", // Right margin
    },
  };

  try {
    // Generate PDF from HTML
    const pdfBuffer = await pdf.generatePdf({ content: htmlContent }, options);
    // res.contentType("application/pdf");
    res.header("Content-Disposition", 'inline; filename="generated_paper.pdf"');
    res.contentType("application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).send({ error: "Failed to generate PDF" });
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
