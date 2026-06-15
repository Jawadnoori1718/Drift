# ── Build stage ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q clean package -DskipTests

# ── Run stage ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Render/Railway/Fly inject PORT; Spring reads it via server.port=${PORT:8080}
EXPOSE 8080
# MaxRAMPercentage keeps the JVM within small free-tier memory limits
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=70 -jar app.jar"]
