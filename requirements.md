Tech Stack:
Front End: React Native Version 0.76(Doc: https://reactnative.dev/docs/getting-started)
Back End: Node + Express (Node Doc: https://nodejs.org/docs/latest-v22.x/api/index.html) (Express Doc: https://expressjs.com/en/5x/api.html)
Audio Transcription API: Deepgram API 4.0 SDK (Doc: https://developers.deepgram.com/docs/getting-started-with-pre-recorded-audio)
Database: Firebase Firestore (Doc: https://firebase.google.com/docs/reference/js)
Authentication: firebase authentication (Doc: https://firebase.google.com/docs/reference/js)
Back End hosting: Vercel
Mobile App Deployment: Expo (Doc: https://docs.expo.dev/get-started/introduction/)

Description:

An Audio based journalling app. Allows users to record themselves speaking and the app captures the recording, transcribes it, structures the transcription as a journal entry and organizes it into journals. 

Pages:
-Welcome Page (Only For new Users)
-Sign up page (With button to sign in page if user is registered)
-Sign In page
-Home Page
-Braindump page
-Vault page
-Profile Page

General Flow:

-New user opens app -> Welcome page pops up with welcome message, with one button captioned "Discover" that points to SignUp Page.
-When the "Discover" button is hit, Sign up page pops up, with funtional fields for First Name, Last Name, email address and password. 
	-Sign up Page should also have an option to go to sign in page if the user is already registered. 
	-Every time a new user registered create a new record in the firestoreDB "Users" Table for that User with their First name, Last Name, Email and the FirebaseAuthentication UID of that user.
-Funtioning Sign In page where registered Users will Sign In
-When a user succesfully signs in, There should be a Home page with a greeting meesage on top along with 3 buttons on the page to navigate to other pages.

Home Page buttons:
Button 1: "Brain Dump" -> Should open the brain dump page. where user can capture their audio based journal and save those transcriptions as journals. Have option to discard current recording as well.
Button 2: "The Vault" -> Should open the vault page where user can browse their saved journals organized based on year, month and day. Should have intuitive UI so the user can scroll and chose the year, month and day they want to look at.
Button 3: Should open the profile page.

Specific Page features:
Braindumppage: This should have a button to start and stop recording the user talking. Once the recording is stopped, preview the transcription below and give the user the option to save the transcription as a journal entry to the vault or discard it. If the user choses to save the trancription, create a new record in the firestoreDB "journals" Table with the UID of the user thats signed in along with the transcription and the time/date stamp.
Vaultpage: Should Allow the user to browse their saved journals in an organized manner.
ProfilePage: Should display the users First Name, Last Name and email. On the bottom should have a functional sign out button that signs the user out, and display the Sign in Page.

----------------

I want to build an app based on the information above. You are a react native expert and engineer. Use a linear development process that develops the app step by step. Refer to the documentation provided above when developing the code. Optimize the functionality and the code, use best practices. Use a profesionally designed modern UI. At the end I want the app to be fully functional. Use javascript and refer to above tech stack with all the documentation while developing the code.