'use strict';
// Sequelize ORM kütüphanesinden 'Model' sınıfını import ediyoruz
const { Model } = require('sequelize');

// Modül dışa aktarılıyor. Bu model başka dosyalar tarafından kullanılabilir.
module.exports = (sequelize, DataTypes) => {

  // User adında bir sınıf tanımlanıyor ve Model sınıfından türetiliyor.
  // Bu sınıf, Sequelize'de veritabanındaki 'users' tablosunu temsil edecek.
  class User extends Model {
    // static associate fonksiyonu, modeller arasındaki ilişkileri tanımlar.
    static associate(models) {
      // İlişkiler burada tanımlanabilir, ancak şu an için boş bırakılmış.
    }
  }

  // User modelinin özelliklerini tanımlıyoruz.
  // 'init' fonksiyonu, bu modelin veritabanı sütunlarını ve tiplerini belirler.
  User.init(
    {
      // 'username' alanı, kullanıcının adını tutar.
      username: {
        type: DataTypes.STRING, // STRING tipinde bir veri bekler.
        allowNull: false, // Boş olamaz.
        unique: true // Kullanıcı adı benzersiz olmalıdır.
      },
      // 'email' alanı, kullanıcının e-posta adresini tutar.
      email: {
        type: DataTypes.STRING, // STRING tipinde bir veri bekler.
        allowNull: false, // Boş olamaz.
        unique: true // E-posta adresi benzersiz olmalıdır.
      },
      // 'password_hash' alanı, şifrelerin hashlenmiş halini tutar.
      password_hash: {
        type: DataTypes.STRING, // STRING tipinde bir veri bekler.
        allowNull: false, // Boş olamaz.
      }
    },
    {
      sequelize, // Sequelize bağlantısını model ile ilişkilendiriyoruz.
      modelName: 'User', // Modelin ismini 'User' olarak belirliyoruz.
      tableName: 'users', // Tablo adı manuel olarak küçük harflerle 'users' olarak ayarlanıyor.
      timestamps: true // 'createdAt' ve 'updatedAt' sütunlarını otomatik olarak ekler.
    }
  );

  // User modelini dışa aktarıyoruz, böylece başka dosyalar bu modelden faydalanabilir.
  return User;
};

