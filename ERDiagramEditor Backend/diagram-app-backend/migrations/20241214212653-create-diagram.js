'use strict'; 
/** @type {import('sequelize-cli').Migration} */

module.exports = { //Migration dosyasının Sequelize CLI ile çalışması için import edilmesi gereken tip.
  async up(queryInterface, Sequelize) { //Bu fonksiyon, veritabanına yeni tablo ekleme işlemini gerçekleştirir.
    await queryInterface.createTable('diagrams', { //diagrams adlı yeni bir tablo oluşturur
      id: { //tabloya ait birincil anahtar
        allowNull: false,
        autoIncrement: true, //her yeni kayıt eklendiğinde otomatik arttır
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: { //diyagramı oluşturan kullanıcı
        type: Sequelize.INTEGER
      },
      name: { //diyagram adı
        type: Sequelize.STRING
      },
      content: { //diyagram içeriği JSON formatında olsun
        type: Sequelize.JSON
      },
      created_at: { //kaydın oluşturulma zamanı
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: { //kaydın güncellenme zamanı
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },
  async down(queryInterface, Sequelize) { //Bu fonksiyon, yapılan değişikliklerin geri alınmasını sağlar.
    await queryInterface.dropTable('Diagrams'); //tabloyu siler
  }
};
