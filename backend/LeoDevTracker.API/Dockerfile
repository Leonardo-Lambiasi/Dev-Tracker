FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Limita heap do GC a 200MB para caber no free tier do Render (512MB RAM)
ENV DOTNET_GCHeapHardLimit=209715200
ENV DOTNET_GCConserveMemory=9
ENV DOTNET_RUNNING_IN_CONTAINER=true

ENTRYPOINT ["dotnet", "LeoDevTracker.API.dll"]
