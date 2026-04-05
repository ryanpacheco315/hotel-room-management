@echo off
setlocal

set MAVEN_PROJECTBASEDIR=%~dp0
set MAVEN_WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar
set MAVEN_WRAPPER_URL=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar

if not exist "%MAVEN_WRAPPER_JAR%" (
    echo Downloading Maven wrapper...
    powershell -Command "(New-Object Net.WebClient).DownloadFile('%MAVEN_WRAPPER_URL%', '%MAVEN_WRAPPER_JAR%')"
)

java -jar "%MAVEN_WRAPPER_JAR%" %*
