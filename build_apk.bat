@echo off
set "JAVA_HOME=D:\jdk-21.0.4+7"
set "PATH=D:\jdk-21.0.4+7\bin;%PATH%"
set "ANDROID_HOME=C:\Users\kumar\AppData\Local\Android\Sdk"
cd /d "d:\cy\mobile-app\android"
echo Building APK with Gradle and Java 21...
call gradlew.bat assembleDebug
echo GRADLE_EXIT_CODE=%ERRORLEVEL%
