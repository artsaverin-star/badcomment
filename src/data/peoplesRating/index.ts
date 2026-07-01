// Auto-maintained barrel, keyed by slug.
import aiAvatarsHeadshots from "./ai-avatars-headshots.json";
import aiWriting from "./ai-writing.json";
import astrology from "./astrology.json";
import babyTracking from "./baby-tracking.json";
import calendarsTasks from "./calendars-tasks.json";
import cryptoInvesting from "./crypto-investing.json";
import datingApps from "./dating-apps.json";
import focusProductivity from "./focus-productivity.json";
import foodDelivery from "./food-delivery.json";
import habitTracking from "./habit-tracking.json";
import journalingMood from "./journaling-mood.json";
import languageLearning from "./language-learning.json";
import meditationMindfulness from "./meditation-mindfulness.json";
import messagingApps from "./messaging-apps.json";
import musicStreaming from "./music-streaming.json";
import notesPkm from "./notes-pkm.json";
import nutritionCalories from "./nutrition-calories.json";
import periodCycle from "./period-cycle.json";
import personalFinance from "./personal-finance.json";
import photoEditing from "./photo-editing.json";
import plantCare from "./plant-care.json";
import recipesMealPlanning from "./recipes-meal-planning.json";
import rideHailing from "./ride-hailing.json";
import shoppingEcommerce from "./shopping-ecommerce.json";
import sleepTracking from "./sleep-tracking.json";
import travelPlanning from "./travel-planning.json";
import videoStreaming from "./video-streaming.json";
import weatherApps from "./weather-apps.json";
import workoutFitness from "./workout-fitness.json";
import scannerPdf from "./scanner-pdf.json";
import aiChatbot from "./ai-chatbot.json";
import intermittentFasting from "./intermittent-fasting.json";
import flashcards from "./flashcards.json";
import translator from "./translator.json";
import runTracking from "./run-tracking.json";
import voiceRecorder from "./voice-recorder.json";
import resumeBuilder from "./resume-builder.json";
import invoiceMaker from "./invoice-maker.json";
import sobriety from "./sobriety.json";
import qrScanner from "./qr-scanner.json";
import mindMapping from "./mind-mapping.json";
import wallpapersWidgets from "./wallpapers-widgets.json";

export const RATING_BY_SLUG: Record<string, unknown> = {
  "scanner-pdf": scannerPdf, "ai-chatbot": aiChatbot, "intermittent-fasting": intermittentFasting, flashcards, translator, "run-tracking": runTracking, "voice-recorder": voiceRecorder, "resume-builder": resumeBuilder, "invoice-maker": invoiceMaker, sobriety, "qr-scanner": qrScanner, "mind-mapping": mindMapping, "wallpapers-widgets": wallpapersWidgets,
  "ai-avatars-headshots": aiAvatarsHeadshots, "ai-writing": aiWriting, astrology, "baby-tracking": babyTracking, "calendars-tasks": calendarsTasks, "crypto-investing": cryptoInvesting, "dating-apps": datingApps, "focus-productivity": focusProductivity, "food-delivery": foodDelivery, "habit-tracking": habitTracking, "journaling-mood": journalingMood, "language-learning": languageLearning, "meditation-mindfulness": meditationMindfulness, "messaging-apps": messagingApps, "music-streaming": musicStreaming, "notes-pkm": notesPkm, "nutrition-calories": nutritionCalories, "period-cycle": periodCycle, "personal-finance": personalFinance, "photo-editing": photoEditing, "plant-care": plantCare, "recipes-meal-planning": recipesMealPlanning, "ride-hailing": rideHailing, "shopping-ecommerce": shoppingEcommerce, "sleep-tracking": sleepTracking, "travel-planning": travelPlanning, "video-streaming": videoStreaming, "weather-apps": weatherApps, "workout-fitness": workoutFitness,
};
