'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', { //Bu fonksiyon, 'users' tablosunu oluşturur.
      id: { //birincil anahtar
        allowNull: false,
        autoIncrement: true, //her yeni kayıt eklendiğinde otomatik arttır
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: { //kullanıcı adı
        type: Sequelize.STRING
      },
      email: { //kullanıcı email
        type: Sequelize.STRING
      },
      password_hash: { //kullanıcının hashlenmiş şifresi
        type: Sequelize.STRING
      },
      createdAt: { //kaydın oluşturulma tarihi
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: { //kaydın güncellenme tarihi
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },
  async down(queryInterface, Sequelize) { //Bu fonksiyon, 'users' tablosunu siler.
    await queryInterface.dropTable('users');
  }
};
