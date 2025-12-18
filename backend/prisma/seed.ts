import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Coordenadas de prueba basadas en Buenos Aires (área de ~10km)
const BASE_LAT = -34.6037;
const BASE_LNG = -58.3816;

// Función para generar coordenadas aleatorias dentro de un radio
function randomCoordinate(base: number, radiusKm: number): number {
  const radiusDegrees = radiusKm / 111.32; // 1 grado ≈ 111.32km
  return base + (Math.random() * radiusDegrees * 2 - radiusDegrees);
}

// Datos de usuarios de prueba
const testUsers = [
  { name: 'Juan Pérez', email: 'juan.perez@test.com', password: 'Test1234!' },
  { name: 'María García', email: 'maria.garcia@test.com', password: 'Test1234!' },
  { name: 'Carlos López', email: 'carlos.lopez@test.com', password: 'Test1234!' },
  { name: 'Ana Martínez', email: 'ana.martinez@test.com', password: 'Test1234!' },
  { name: 'Pedro Rodríguez', email: 'pedro.rodriguez@test.com', password: 'Test1234!' },
  { name: 'Laura Fernández', email: 'laura.fernandez@test.com', password: 'Test1234!' },
  { name: 'Julio Sánchez', email: 'julio.sanchez@test.com', password: 'Test1234!' },
  { name: 'Sofía Gómez', email: 'sofia.gomez@test.com', password: 'Test1234!' },
  { name: 'Martín Díaz', email: 'martin.diaz@test.com', password: 'Test1234!' },
  { name: 'Valentina Torres', email: 'valentina.torres@test.com', password: 'Test1234!' },
];

// Descripciones de ejemplo para eventos
const eventDescriptions = {
  THEFT: [
    'Motocicleta robada en la esquina',
    'Intentaron robar mi vehículo estacionado',
    'Robo de bicicleta frente al local',
    'Sospechosos merodeando el área',
    'Vehículo robado durante la madrugada',
  ],
  LOST: [
    'Perdí mi dispositivo GPS',
    'Extravío de dispositivo de tracking',
    'No encuentro mi rastreador',
    'Dispositivo perdido en zona comercial',
    'Extravío durante mudanza',
  ],
  ACCIDENT: [
    'Choque leve en intersección',
    'Accidente de tránsito menor',
    'Colisión en estacionamiento',
    'Accidente con daños materiales',
    'Desperfecto mecánico en ruta',
  ],
  FIRE: [
    'Pequeño incendio en motor',
    'Sobrecalentamiento de vehículo',
    'Incendio controlado rápidamente',
    'Humo proveniente del motor',
    'Principio de incendio en cables',
  ],
};

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  // Hashear password común
  const hashedPassword = await bcrypt.hash('Test1234!', 10);

  // Crear usuarios y sus eventos
  for (const userData of testUsers) {
    console.log(`\n👤 Creando usuario: ${userData.name}`);

    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        areaOfInterestLatitude: BASE_LAT + (Math.random() * 0.02 - 0.01),
        areaOfInterestLongitude: BASE_LNG + (Math.random() * 0.02 - 0.01),
        areaOfInterestRadius: 5000,
      },
    });

    // Generar entre 3 y 6 eventos por usuario
    const numEvents = Math.floor(Math.random() * 4) + 3; // 3 a 6
    const eventTypes = Object.keys(eventDescriptions);

    for (let i = 0; i < numEvents; i++) {
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)] as keyof typeof eventDescriptions;
      const descriptions = eventDescriptions[type];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      const status = Math.random() > 0.3 ? 'IN_PROGRESS' : 'CLOSED';
      
      // Generar coordenadas dentro de 10km del centro
      const latitude = randomCoordinate(BASE_LAT, 10);
      const longitude = randomCoordinate(BASE_LNG, 10);

      // Fecha aleatoria en los últimos 30 días
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));

      await prisma.event.create({
        data: {
          userId: user.id,
          type,
          description,
          latitude,
          longitude,
          status,
          isPublic: true,
          createdAt,
        },
      });

      console.log(`   📍 Evento creado: ${type} - ${status}`);
    }
  }

  console.log('\n✅ Seed completado exitosamente!');
  console.log('\n📋 Credenciales de prueba:');
  console.log('Password común para todos los usuarios: Test1234!');
  console.log('\nEmails de usuarios:');
  testUsers.forEach(user => {
    console.log(`  - ${user.email}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
