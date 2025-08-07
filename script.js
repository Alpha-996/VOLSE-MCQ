document.addEventListener("DOMContentLoaded", () => {
    // Application State
    const state = {
        currentUser: "",
        score: 0,
        incorrectAnswers: [],
    };

    // DOM Elements
    const screens = {
        start: document.getElementById("start-screen"),
        quiz: document.getElementById("quiz-container"),
        results: document.getElementById("results-container"),
    };
    
    const usernameInput = document.getElementById("username");
    const startBtn = document.getElementById("start-btn");
    const quizForm = document.getElementById("quiz-form");
    const quizUserGreeting = document.getElementById("quiz-user-greeting");
    
    const scoreDisplay = document.getElementById("score-display");
    const incorrectAnswersList = document.getElementById("incorrect-answers-list");
    
    const downloadTxtBtn = document.getElementById("download-txt-btn");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const restartBtn = document.getElementById("restart-btn");

    // --- NEW: Shuffle Function (Fisher-Yates Algorithm) ---
    // This function shuffles an array in-place.
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            // Pick a random index from 0 to i
            const j = Math.floor(Math.random() * (i + 1));
            // Swap array[i] with the element at the random index
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Core Functions ---

    // Switches the visible screen
    function switchScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove("active"));
        screens[screenName].classList.add("active");
    }

    // Renders quiz questions efficiently with randomization
    function renderQuiz() {
        // MODIFIED: 1. Shuffle the order of the questions each time the quiz is rendered.
        shuffleArray(quizData);

        const quizHtml = quizData.map((item, index) => {
            // MODIFIED: 2. Create a shuffled copy of the options for this specific question.
            const shuffledOptions = [...item.options]; // Create a copy to not alter the original object
            shuffleArray(shuffledOptions);

            // Use the shuffledOptions array to build the HTML
            return `
            <div class="question-item">
                <p>${index + 1}. ${item.question}</p>
                <div class="options-container">
                    ${shuffledOptions.map(option => `
                        <div>
                            <input type="radio" id="q${index}_${option.replace(/[^a-zA-Z0-9]/g, '')}" name="question${index}" value="${option}" required>
                            <label for="q${index}_${option.replace(/[^a-zA-Z0-9]/g, '')}" class="option">${option}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        }).join('');
        quizForm.innerHTML = quizHtml;
    }

    // Calculates score and prepares results data
    function calculateResults() {
        state.score = 0;
        state.incorrectAnswers = [];
        const formData = new FormData(quizForm);

        // Note: We iterate over quizData which is in the same shuffled order as the displayed form
        quizData.forEach((item, index) => {
            const userAnswer = formData.get(`question${index}`);
            if (userAnswer === item.answer) {
                state.score++;
            } else {
                state.incorrectAnswers.push({
                    question: item.question,
                    userAnswer: userAnswer || "Not Answered",
                    correctAnswer: item.answer,
                });
            }
        });
    }
    
    // Displays the final results
    function displayResults() {
        scoreDisplay.textContent = `Hi ${state.currentUser}, you scored ${state.score} out of ${quizData.length}.`;
        
        if (state.incorrectAnswers.length === 0) {
            incorrectAnswersList.innerHTML = "<p>Flawless victory! You answered all questions correctly. ✨</p>";
        } else {
            incorrectAnswersList.innerHTML = state.incorrectAnswers.map(item => `
                <div class="incorrect-question">
                    <p><strong>Question:</strong> ${item.question}</p>
                    <p><strong>Your Answer:</strong> <span class="user-answer">${item.userAnswer}</span></p>
                    <p><strong>Correct Answer:</strong> <span class="correct-answer">${item.correctAnswer}</span></p>
                </div>
            `).join('');
        }
    }
    
    // Resets the application to its initial state
    function resetQuiz() {
        state.currentUser = "";
        state.score = 0;
        state.incorrectAnswers = [];
        usernameInput.value = "";
        quizForm.reset();
        // The quiz will be re-rendered with a new random order when the user starts again
        switchScreen("start");
    }

    // --- Event Handlers ---

    startBtn.addEventListener("click", () => {
        state.currentUser = usernameInput.value.trim();
        if (state.currentUser) {
            quizUserGreeting.textContent = `All the best, ${state.currentUser}!`;
            renderQuiz(); // Render with new random order
            switchScreen("quiz");
        } else {
            alert("Please provide your name to begin.");
        }
    });

    quizForm.addEventListener("submit", (event) => {
        event.preventDefault();
        calculateResults();
        displayResults();
        switchScreen("results");
    });

    restartBtn.addEventListener("click", resetQuiz);

    downloadTxtBtn.addEventListener("click", () => {
        let textContent = `Quiz Results for: ${state.currentUser}\n`;
        textContent += `Final Score: ${state.score} / ${quizData.length}\n\n--- Review ---\n\n`;
        state.incorrectAnswers.forEach(item => {
            textContent += `Q: ${item.question}\nYour Answer: ${item.userAnswer}\nCorrect Answer: ${item.correctAnswer}\n\n`;
        });
        const blob = new Blob([textContent], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `quiz-results-${state.currentUser.replace(" ", "_")}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
    });

    downloadPdfBtn.addEventListener("click", () => {
        if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
            alert("PDF generation library is still loading. Please try again in a moment.");
            return;
        }
        const { jsPDF } = window.jspdf;
        const resultsContent = document.getElementById('results-content');
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        html2canvas(resultsContent, { scale: 2, useCORS: true, backgroundColor: null }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 10;

            doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - 20);

            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            doc.save(`quiz-results-${state.currentUser.replace(" ", "_")}.pdf`);
        });
    });

    // --- Initial Setup ---
    // No need to render quiz here anymore, it will be rendered on 'start' button click
    switchScreen("start");
});


// --- Quiz Data ---
// This remains unchanged at the bottom of the file
const quizData = [
    { question: "What is the primary benefit of self-awareness?", options: ["Improved relationships", "Increased confidence", "Better decision making", "All of the above"], answer: "All of the above" },
    { question: "Which of the following is a characteristic of a growth mindset?", options: ["Avoiding challenges", "Embracing failures", "Fear of failure", "Fixed abilities"], answer: "Embracing failures" },
    { question: "What is the key element of effective communication in relationships?", options: ["Active listening", "Clear expression", "Empathy", "All of the above"], answer: "All of the above" },
    { question: "How do you build trust in relationships?", options: ["By being reliable and honest", "By being transparent and consistent", "By following through on commitments", "All of the above"], answer: "All of the above" },
    { question: "What is the purpose of using \"I\" statements in communication?", options: ["To blame others", "To take ownership of thoughts and feelings", "To avoid responsibility", "To criticize others"], answer: "To take ownership of thoughts and feelings" },
    { question: "Which of the following is a benefit of active listening?", options: ["Improved relationships", "Increased productivity", "Better understanding", "All of the above"], answer: "All of the above" },
    { question: "What is the primary benefit of adaptability in change management?", options: ["Reduced stress", "Increased productivity", "Better decision making", "All of the above"], answer: "All of the above" },
    { question: "Which of the following is a strategy for managing uncertainty?", options: ["Avoiding change", "Resisting change", "Embracing change", "Denying change"], answer: "Embracing change" },
    { question: "Which of the following is an effective stress management technique?", options: ["Avoidance", "Denial", "Exercise", "Substance use"], answer: "Exercise" },
    { question: "Which of the following is a characteristic of responsible decision making?", options: ["Impulsivity", "Emotional reasoning", "Logical reasoning", "Avoidance"], answer: "Logical reasoning" },
    { question: "What is the key element of effective decision making?", options: ["Identifying options", "Evaluating options", "Choosing an option", "All of the above"], answer: "All of the above" },
    { question: "Which of the following is a consequence of impulsive decision making?", options: ["Regret", "Relief", "Satisfaction", "Joy"], answer: "Regret" },
    { question: "What is the key element of evaluating options in decision making?", options: ["Identifying pros and cons", "Considering personal values", "Evaluating evidence", "All of the above"], answer: "All of the above" },
    { question: "What is the benefit of using clear and concise language in communication?", options: ["Increased misunderstandings", "Decreased clarity", "Improved understanding", "All of the above"], answer: "Improved understanding" },
    { question: "Which of the following is an effective communication strategy?", options: ["Interrupting others", "Active listening", "Defensiveness", "Aggressiveness"], answer: "Active listening" },
    { question: "What is the key element of effective communication?", options: ["Sender's perspective", "Receiver's perspective", "Mutual understanding", "All of the above"], answer: "Mutual understanding" },
    { question: "Which of the following is an effective problem-solving strategy?", options: ["Avoiding the problem", "Blaming others", "Breaking down complex problems", "Giving up easily"], answer: "Breaking down complex problems" },
    { question: "What is the primary benefit of critical thinking?", options: ["Accepting information at face value", "Questioning assumptions", "Making impulsive decisions", "Following tradition"], answer: "Questioning assumptions" },
    { question: "Which of the following is a characteristic of critical thinking?", options: ["Emotional reasoning", "Logical reasoning", "Intuitive reasoning", "Creative reasoning"], answer: "Logical reasoning" },
    { question: "What is the primary benefit of effective teamwork?", options: ["Increased productivity", "Improved relationships", "Better decision making", "Enhanced creativity"], answer: "Increased productivity" },
    { question: "What is the primary benefit of accountability?", options: ["Increased productivity", "Improved relationships", "Better decision making", "Enhanced responsibility"], answer: "Enhanced responsibility" },
    { question: "Which of the following is a characteristic of resilience?", options: ["Giving up easily", "Overreacting to challenges", "Bouncing back from setbacks", "Avoiding challenges"], answer: "Bouncing back from setbacks" },
    { question: "What is self-awareness?", options: ["Knowing other people's feelings", "Understanding one's own emotions and values", "Ignoring personal strengths and weaknesses", "Mimicking others' behaviours"], answer: "Understanding one's own emotions and values" },
    { question: "Which technique can improve self-awareness?", options: ["Ignoring feedback", "Avoiding reflection", "Practicing mindfulness", "Reacting impulsively"], answer: "Practicing mindfulness" },
    { question: "Why is self-awareness important?", options: ["To manipulate others", "To better understand and manage one's own emotions", "To control others", "To focus solely on external achievements"], answer: "To better understand and manage one's own emotions" },
    { question: "What is a common method to develop self-awareness?", options: ["Ignoring self-reflection", "Seeking feedback from others", "Avoiding personal growth", "Suppressing emotions"], answer: "Seeking feedback from others" },
    { question: "What is the key component of building strong relationships?", options: ["Ignoring others", "Empathy", "Being self-centred", "Avoiding communication"], answer: "Empathy" },
    { question: "Why is trust important in relationships?", options: ["It creates uncertainty", "It builds reliability and honesty", "It encourages deceit", "It leads to conflicts"], answer: "It builds reliability and honesty" },
    { question: "What does active listening involve?", options: ["Interrupting the speaker", "Ignoring body language", "Paying full attention to the speaker and responding thoughtfully", "Thinking about your response while the other person is speaking"], answer: "Paying full attention to the speaker and responding thoughtfully" },
    { question: "What is effective communication?", options: ["Speaking loudly", "Conveying information clearly and listening actively", "Using complex language", "Ignoring non-verbal cues"], answer: "Conveying information clearly and listening actively" },
    { question: "Which is a barrier to effective communication?", options: ["Active listening", "Clear speech", "Distractions and noise", "Eye contact"], answer: "Distractions and noise" },
    { question: "What role do non-verbal cues play in communication?", options: ["They are irrelevant", "They contradict verbal messages", "They complement and reinforce verbal messages", "They are always more important than verbal messages"], answer: "They complement and reinforce verbal messages" },
    { question: "What is change management?", options: ["Resisting new situations", "Adapting to new situations and guiding others through transitions", "Ignoring changes", "Enforcing old methods"], answer: "Adapting to new situations and guiding others through transitions" },
    { question: "Why is flexibility important in change management?", options: ["To resist change", "To adapt to new situations", "To stay rigid", "To increase stress"], answer: "To adapt to new situations" },
    { question: "Which strategy can help manage change effectively?", options: ["Avoiding planning", "Developing strategies and plans", "Ignoring support systems", "Sticking to old habits"], answer: "Developing strategies and plans" },
    { question: "How can support systems aid in change management?", options: ["By isolating individuals", "By providing emotional and practical support", "By increasing stress", "By preventing adaptation"], answer: "By providing emotional and practical support" },
    { question: "What is stress management?", options: ["Ignoring stressors", "Increasing stress", "Avoiding relaxation techniques", "Recognizing and employing strategies to cope with stress"], answer: "Recognizing and employing strategies to cope with stress" },
    { question: "Why is stress management important?", options: ["To promote mental health", "To increase anxiety", "To encourage burnout", "To reduce productivity"], answer: "To promote mental health" },
    { question: "Which technique can help manage stress?", options: ["Procrastination", "Deep breathing exercises", "Overworking", "Ignoring problems"], answer: "Deep breathing exercises" },
    { question: "How does maintaining a healthy lifestyle help with stress management?", options: ["By ignoring diet and sleep", "By promoting physical and mental well-being", "By increasing stress levels", "By neglecting exercise"], answer: "By promoting physical and mental well-being" },
    { question: "What is responsible decision making?", options: ["Making impulsive choices", "Making ethical and considerate choices", "Ignoring consequences", "Making decisions based on emotions only"], answer: "Making ethical and considerate choices" },
    { question: "Why is responsible decision making important?", options: ["To lead to poor outcomes", "To build trust and respect", "To promote unfair treatment", "To ignore ethical considerations"], answer: "To build trust and respect" },
    { question: "Which step is essential in responsible decision making?", options: ["Ignoring information", "Evaluating potential outcomes", "Making hasty choices", "Neglecting consequences"], answer: "Evaluating potential outcomes" },
    { question: "What is the Johari Window used for?", options: ["Increasing self-awareness and understanding how others perceive us", "Ignoring personal traits", "Enhancing physical health", "Developing technical skills"], answer: "Increasing self-awareness and understanding how others perceive us" },
    { question: "How can journaling help with self-awareness?", options: ["By providing a platform for reflection and understanding of emotions", "By avoiding personal thoughts", "By creating confusion", "By focusing on others"], answer: "By providing a platform for reflection and understanding of emotions" },
    { question: "What is a key outcome of effective relationship building?", options: ["Isolation", "Improved teamwork and collaboration", "Increased conflicts", "Distrust"], answer: "Improved teamwork and collaboration" },
    { question: "How can one improve their relationship-building skills?", options: ["By practicing active listening and empathy", "By avoiding social interactions", "By being judgmental", "By focusing on their own needs only"], answer: "By practicing active listening and empathy" },
    { question: "Which of the following is a barrier to effective communication?", options: ["Open body language", "Active listening", "Stereotyping", "Clarity in speech"], answer: "Stereotyping" },
    { question: "What is the main purpose of feedback in communication?", options: ["To judge others", "To confirm understanding and improve future interactions", "To criticize harshly", "To end conversations"], answer: "To confirm understanding and improve future interactions" },
    { question: "How does effective communication impact team dynamics?", options: ["It creates misunderstandings", "It fosters collaboration and reduces conflicts", "It leads to isolation", "It decreases productivity"], answer: "It fosters collaboration and reduces conflicts" },
    { question: "What is a common emotional reaction to change?", options: ["Indifference", "Anxiety", "Excitement only", "Always immediate acceptance"], answer: "Anxiety" },
    { question: "Which approach is essential for leading change effectively?", options: ["Ignoring the concerns of others", "Communicating clearly and involving stakeholders", "Resisting new ideas", "Avoiding planning"], answer: "Communicating clearly and involving stakeholders" },
    { question: "How can organizations support their employees during change?", options: ["By providing no information", "By offering training and resources", "By increasing workload", "By ignoring their needs"], answer: "By offering training and resources" },
    { question: "What is a proactive step in managing personal change?", options: ["Resisting any form of change", "Planning and preparing for potential changes", "Ignoring future possibilities", "Reacting impulsively"], answer: "Planning and preparing for potential changes" },
    { question: "What role does physical exercise play in stress management?", options: ["It increases stress levels", "It only tires the body without mental benefits", "It has no impact on stress", "It helps reduce stress by releasing endorphins"], answer: "It helps reduce stress by releasing endorphins" },
    { question: "Which of the following is an effective relaxation technique for stress management?", options: ["Overthinking", "Deep breathing exercises", "Excessive caffeine intake", "Skipping sleep"], answer: "Deep breathing exercises" },
    { question: "What is the first step in responsible decision making?", options: ["Ignoring the problem", "Identifying the decision to be made", "Making an impulsive choice", "Avoiding the collection of information"], answer: "Identifying the decision to be made" },
    { question: "Why is considering the consequences important in decision making?", options: ["To make uninformed choices", "To evaluate the impact of decisions on oneself and others", "To disregard potential outcomes", "To focus only on immediate benefits"], answer: "To evaluate the impact of decisions on oneself and others" },
    { question: "What is an ethical framework?", options: ["A set of principles that guide decision making based on personal and societal values", "A tool for making impulsive decisions", "A method to ignore ethics", "A process for increasing conflicts"], answer: "A set of principles that guide decision making based on personal and societal values" },
    { question: "How can meditation enhance self-awareness?", options: ["By increasing external focus and emotional balance", "By ignoring thoughts", "By promoting inner reflection", "By causing stress"], answer: "By promoting inner reflection" },
    { question: "Which of the following actions damages trust in a relationship?", options: ["Being dishonest", "Keeping promises", "Communicating openly", "Showing respect"], answer: "Being dishonest" },
    { question: "What is the impact of stereotypes on communication?", options: ["They enhance understanding", "They improve clarity", "They create barriers and misunderstandings", "They have no effect"], answer: "They create barriers and misunderstandings" },
    { question: "What is the first step in managing change effectively?", options: ["Ignoring the change", "Understanding the change and its implications", "Resisting new ideas", "Avoiding communication"], answer: "Understanding the change and its implications" },
    { question: "What is one psychological symptom of stress?", options: ["Calmness", "Happiness", "Euphoria", "Anxiety"], answer: "Anxiety" },
    { question: "What should be done after making a decision?", options: ["Evaluating the results and learning from the experience", "Ignoring the outcome", "Avoiding feedback", "Disregarding the consequences"], answer: "Evaluating the results and learning from the experience" },
    { question: "What is an example of a self-awareness activity?", options: ["Ignoring personal thoughts", "Keeping a journal", "Overworking", "Avoiding feedback"], answer: "Keeping a journal" },
    { question: "How can conflicts be resolved in relationships?", options: ["By ignoring them", "By blaming others", "By addressing issues openly and finding mutually beneficial solutions", "By avoiding communication"], answer: "By addressing issues openly and finding mutually beneficial solutions" },
    { question: "How can one show empathy in a relationship?", options: ["By dismissing others' feelings", "By actively listening and validating their emotions", "By focusing on one's own needs", "By avoiding emotional conversations"], answer: "By actively listening and validating their emotions" },
    { question: "What is a sign of effective change management in an organization?", options: ["High resistance to change", "Widespread confusion", "Increased turnover", "Smooth transitions and positive adaptation"], answer: "Smooth transitions and positive adaptation" },
    { question: "How can leaders support employees during change?", options: ["By ignoring their concerns", "By providing guidance, resources, and emotional support", "By imposing changes without explanation", "By avoiding discussions about change"], answer: "By providing guidance, resources, and emotional support" },
    { question: "What is a key benefit of practicing relaxation techniques?", options: ["Reduced stress and improved mental clarity", "Increased anxiety", "Decreased focus", "Heightened tension"], answer: "Reduced stress and improved mental clarity" },
    { question: "What is the significance of considering alternatives in decision making?", options: ["To avoid making a decision", "To stick with the first idea", "To confuse oneself", "To explore different options and choose the best one"], answer: "To explore different options and choose the best one" },
    { question: "How can ethical considerations impact decision making?", options: ["They are irrelevant", "They ensure decisions are fair and just", "They complicate the process", "They lead to unethical choices"], answer: "They ensure decisions are fair and just" },
    { question: "What is a characteristic of healthy relationships?", options: ["Constant conflict", "Lack of communication", "Mutual respect and trust", "Dominance by one person"], answer: "Mutual respect and trust" },
    { question: "What is the role of active listening in communication?", options: ["To ignore the speaker", "To fully understand the speaker's message and respond thoughtfully", "To dominate the conversation", "To prepare your response while the other person speaks"], answer: "To fully understand the speaker's message and respond thoughtfully" },
    { question: "How can one improve their verbal communication skills?", options: ["By using jargon", "By ignoring feedback", "By speaking more quickly", "By practicing clear and concise speech"], answer: "By practicing clear and concise speech" },
    { question: "Why is it important to be aware of cultural differences in communication?", options: ["To create misunderstandings", "To ignore others' perspectives", "To ensure respectful and effective interactions", "To enforce one's own communication style"], answer: "To ensure respectful and effective interactions" },
    { question: "How does adequate sleep contribute to stress management?", options: ["It helps the body and mind recover and function optimally", "It increases stress levels", "It has no effect", "It decreases mental clarity"], answer: "It helps the body and mind recover and function optimally" },
    { question: "Which of the following is an example of a stressor?", options: ["Relaxation", "Job demands", "Healthy lifestyle", "Positive thinking"], answer: "Job demands" },
    { question: "What should be done if a decision leads to unexpected negative outcomes?", options: ["Ignoring the outcomes", "Analyzing what went wrong and learning from the experience", "Blaming others", "Repeating the same decision"], answer: "Analyzing what went wrong and learning from the experience" },
    { question: "What is the benefit of having strong relationships in personal life?", options: ["Increased isolation", "Increased conflicts", "Enhanced emotional support and well-being", "Reduced happiness"], answer: "Enhanced emotional support and well-being" },
    { question: "What is an example of a non-verbal communication barrier?", options: ["Open body language", "Consistent eye contact", "Inconsistent facial expressions", "Clear verbal messages"], answer: "Inconsistent facial expressions" },
    { question: "Why is flexibility important in change management?", options: ["It creates rigidity", "It allows for adjustments based on feedback and evolving circumstances", "It leads to confusion", "It ignores stakeholders' needs"], answer: "It allows for adjustments based on feedback and evolving circumstances" },
    { question: "What is a potential consequence of poorly managed change?", options: ["Smooth transitions", "Improved communication", "Enhanced productivity", "Increased resistance and decreased morale"], answer: "Increased resistance and decreased morale" },
    { question: "Why is it important to have a support network for stress management?", options: ["To increase isolation", "To provide emotional and practical assistance during stressful times", "To discourage seeking help", "To amplify stress"], answer: "To provide emotional and practical assistance during stressful times" },
    { question: "What is a key benefit of involving diverse perspectives in decision making?", options: ["Broader range of ideas and solutions", "Limited viewpoints", "Increased biases", "Narrow focus"], answer: "Broader range of ideas and solutions" },
    { question: "What is the impact of self-awareness on leadership?", options: ["It reduces leadership effectiveness", "It enhances leaders' ability to understand and manage their own and others' emotions", "It has no impact", "It creates distance from the team"], answer: "It enhances leaders' ability to understand and manage their own and others' emotions" },
    { question: "How can active listening improve communication?", options: ["By ignoring the speaker", "By focusing on your own response", "By interrupting frequently", "By demonstrating interest and understanding in the conversation"], answer: "By demonstrating interest and understanding in the conversation" },
    { question: "What is an example of a healthy coping mechanism for stress?", options: ["Overeating", "Regular physical exercise", "Procrastination", "Substance abuse"], answer: "Regular physical exercise" },
    { question: "What is an ethical dilemma?", options: ["A situation with a clear right and wrong choice", "An easy decision", "A complex situation involving conflicting moral principles", "A straightforward choice"], answer: "A complex situation involving conflicting moral principles" },
    { question: "How can one effectively apologize in a relationship?", options: ["By avoiding the issue", "By acknowledging the mistake and expressing genuine remorse", "By blaming the other person", "By being insincere"], answer: "By acknowledging the mistake and expressing genuine remorse" },
    { question: "What is an example of a change management strategy?", options: ["Communicating the vision and involving stakeholders", "Ignoring employees' input", "Imposing changes without explanation", "Avoiding feedback"], answer: "Communicating the vision and involving stakeholders" },
    { question: "Why is it important to celebrate small wins during change?", options: ["To discourage progress", "To focus only on large goals", "To maintain momentum and boost morale", "To ignore achievements"], answer: "To maintain momentum and boost morale" },
    { question: "What is the benefit of understanding one's strengths and weaknesses?", options: ["It limits growth", "It enhances personal development and performance", "It creates self-doubt", "It reduces confidence"], answer: "It enhances personal development and performance" },
    { question: "What is a barrier to effective communication?", options: ["Clear messaging", "Active listening", "Noise and distractions", "Consistent feedback"], answer: "Noise and distractions" },
    { question: "How can one handle uncertainty in decision making?", options: ["By gathering information and weighing options carefully", "By avoiding decisions", "By acting without thought", "By relying solely on intuition"], answer: "By gathering information and weighing options carefully" },
    { question: "Why is emotional self-regulation important?", options: ["It leads to frequent emotional outbursts", "It helps maintain control over one's reactions and interactions", "It increases stress", "It reduces self-awareness"], answer: "It helps maintain control over one's reactions and interactions" },
    { question: "How can ethical considerations influence decision making?", options: ["They are insignificant", "They ensure decisions are aligned with moral values and societal norms", "They complicate the process", "They lead to unethical choices"], answer: "They ensure decisions are aligned with moral values and societal norms" },
    { question: "How can one recognize and challenge their biases?", options: ["By reinforcing stereotypes", "By ignoring differing viewpoints", "By seeking diverse perspectives and questioning assumptions", "By avoiding self-reflection"], answer: "By seeking diverse perspectives and questioning assumptions" },
    { question: "How can one ensure their message is understood as intended?", options: ["By being clear and seeking feedback to confirm understanding", "By using vague language", "By ignoring the audience", "By avoiding questions"], answer: "By being clear and seeking feedback to confirm understanding" },
    { question: "How can one support a colleague effectively?", options: ["By being indifferent to their needs", "By offering help and showing empathy", "By ignoring their struggles", "By avoiding interaction"], answer: "By offering help and showing empathy" },
    { question: "How can one communicate effectively in a crisis situation?", options: ["By withholding information", "By avoiding communication", "By creating panic", "By being clear, concise, and timely with updates"], answer: "By being clear, concise, and timely with updates" },
    { question: "How can change champions support the change process?", options: ["By resisting changes", "By promoting the benefits and encouraging others to embrace the change", "By avoiding involvement", "By creating opposition"], answer: "By promoting the benefits and encouraging others to embrace the change" },
    { question: "How can one identify their emotional triggers?", options: ["By avoiding self-reflection", "By blaming others", "By ignoring emotions", "By paying attention to situations that cause strong emotional reactions"], answer: "By paying attention to situations that cause strong emotional reactions" },
    { question: "What is the benefit of self-reflection on past experiences?", options: ["It limits learning", "It provides insights for personal growth and future improvement", "It creates regret", "It reinforces mistakes"], answer: "It provides insights for personal growth and future improvement" },
    { question: "Why is it essential to celebrate milestones during change initiatives?", options: ["To motivate and acknowledge efforts", "To ignore progress", "To create unnecessary celebrations", "To distract from the main goal"], answer: "To motivate and acknowledge efforts" },
    { question: "How can mindfulness practices improve self-awareness?", options: ["By promoting automatic behaviors", "By fostering present-moment awareness and introspection", "By increasing distractions", "By reducing self-reflection"], answer: "By fostering present-moment awareness and introspection" },
    { question: "How can one show respect in a professional relationship?", options: ["By disregarding others' opinions", "By interrupting frequently", "By valuing their contributions and treating them with courtesy", "By avoiding communication"], answer: "By valuing their contributions and treating them with courtesy" },
];
